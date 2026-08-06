"""Distance engine for dispatch optimization with batched Google Matrix calls."""

import math
import os
import threading
import time
from typing import Iterable
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

MAX_ORIGINS_PER_REQUEST = 25
DEFAULT_TIMEOUT_SEC = 15
ALLOWED_TRAVEL_MODES = {"driving", "walking", "bicycling"}
DEFAULT_CACHE_TTL_SECONDS = int(os.getenv("DISTANCE_CACHE_TTL_SECONDS", "900"))
GOOGLE_API_FAILURE_THRESHOLD = max(1, int(os.getenv("GOOGLE_API_FAILURE_THRESHOLD", "3")))
GOOGLE_API_COOLDOWN_SECONDS = max(15, int(os.getenv("GOOGLE_API_COOLDOWN_SECONDS", "120")))
GOOGLE_API_REQUESTS_PER_MINUTE = max(1, int(os.getenv("GOOGLE_API_REQUESTS_PER_MINUTE", "120")))

try:
    import redis  # type: ignore
except Exception:
    redis = None


class _DistanceCache:
    def __init__(self, ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, float, float]] = {}
        self._redis = None

        redis_url = os.getenv("REDIS_URL")
        if redis_url and redis is not None:
            try:
                self._redis = redis.Redis.from_url(redis_url, decode_responses=True)
            except Exception:
                self._redis = None

    def get(self, key: str) -> tuple[float, float] | None:
        if self._redis is not None:
            try:
                raw = self._redis.get(key)
                if not raw:
                    return None
                dist_str, dur_str = raw.split(",", 1)
                return float(dist_str), float(dur_str)
            except Exception:
                return None

        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, distance_km, duration_min = entry
        if expires_at <= time.time():
            self._store.pop(key, None)
            return None
        return distance_km, duration_min

    def set(self, key: str, distance_km: float, duration_min: float) -> None:
        if self._redis is not None:
            try:
                self._redis.setex(key, self._ttl, f"{distance_km},{duration_min}")
                return
            except Exception:
                pass

        expires_at = time.time() + self._ttl
        self._store[key] = (expires_at, distance_km, duration_min)


_DISTANCE_CACHE = _DistanceCache()


class _CircuitBreaker:
    def __init__(self, failure_threshold: int, cooldown_seconds: int):
        self._failure_threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds
        self._failures = 0
        self._opened_at = 0.0
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            if self._opened_at == 0.0:
                return True
            if time.time() - self._opened_at >= self._cooldown_seconds:
                self._opened_at = 0.0
                self._failures = 0
                return True
            return False

    def record_success(self) -> None:
        with self._lock:
            self._failures = 0
            self._opened_at = 0.0

    def record_failure(self) -> None:
        with self._lock:
            self._failures += 1
            if self._failures >= self._failure_threshold:
                self._opened_at = time.time()


class _RateLimiter:
    def __init__(self, limit_per_minute: int):
        self._limit = limit_per_minute
        self._tokens = float(limit_per_minute)
        self._last_refill = time.time()
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            now = time.time()
            elapsed = now - self._last_refill
            refill = elapsed * (self._limit / 60.0)
            if refill > 0:
                self._tokens = min(float(self._limit), self._tokens + refill)
                self._last_refill = now
            if self._tokens < 1.0:
                return False
            self._tokens -= 1.0
            return True


_GOOGLE_CIRCUIT_BREAKER = _CircuitBreaker(GOOGLE_API_FAILURE_THRESHOLD, GOOGLE_API_COOLDOWN_SECONDS)
_GOOGLE_RATE_LIMITER = _RateLimiter(GOOGLE_API_REQUESTS_PER_MINUTE)


def _resolve_google_maps_api_key() -> str:
    """
    Resolve API key with fallback order:
    1) GOOGLE_MAPS_API_KEY (backend env)
    2) VITE_GOOGLE_MAPS_API_KEY (frontend env naming)
    3) Load .env and frontend/.env, then retry both keys
    """
    key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY")
    if key:
        return key

    if load_dotenv is not None:
        project_root = Path(__file__).resolve().parents[1]
        load_dotenv(project_root / ".env", override=False)
        load_dotenv(project_root / "frontend" / ".env", override=False)

    return os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY") or ""


def _google_api_allowed() -> bool:
    return _GOOGLE_RATE_LIMITER.allow() and _GOOGLE_CIRCUIT_BREAKER.allow()


def _chunked(values: list, chunk_size: int) -> Iterable[list]:
    for idx in range(0, len(values), chunk_size):
        yield values[idx: idx + chunk_size]


def _is_valid_technician(tech: dict) -> bool:
    required_fields = ("id", "latitude", "longitude")
    return all(field in tech and tech[field] is not None for field in required_fields)


def _build_origins(technicians_batch: list[dict]) -> str:
    return "|".join(f"{float(t['latitude'])},{float(t['longitude'])}" for t in technicians_batch)


def _parse_element(element: dict) -> tuple[float, float] | None:
    if not isinstance(element, dict):
        return None
    if element.get("status") != "OK":
        return None

    distance = element.get("distance")
    duration = element.get("duration_in_traffic") or element.get("duration")

    if not isinstance(distance, dict) or not isinstance(duration, dict):
        return None
    if "value" not in distance or "value" not in duration:
        return None

    distance_km = float(distance["value"]) / 1000.0
    duration_min = float(duration["value"]) / 60.0
    return round(distance_km, 2), round(duration_min, 2)


def _cache_key(origin: tuple[float, float], destination: tuple[float, float], mode: str) -> str:
    o_lat, o_lng = origin
    d_lat, d_lng = destination
    return f"distance:{mode}:{o_lat:.5f},{o_lng:.5f}:{d_lat:.5f},{d_lng:.5f}"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fallback_duration_min(distance_km: float) -> float:
    speed_kmh = 25.0 if distance_km <= 25.0 else 50.0
    return round((distance_km / speed_kmh) * 60.0, 2)


def get_distance(
    origin: tuple[float, float],
    destination: tuple[float, float],
    mode: str = "driving",
) -> tuple[float, float]:
    if mode not in ALLOWED_TRAVEL_MODES:
        raise ValueError(f"Unsupported mode '{mode}'. Allowed: {sorted(ALLOWED_TRAVEL_MODES)}")

    key = _cache_key(origin, destination, mode)
    cached = _DISTANCE_CACHE.get(key)
    if cached:
        return cached

    api_key = _resolve_google_maps_api_key()
    if api_key:
        if not _google_api_allowed():
            return round(_haversine_km(origin[0], origin[1], destination[0], destination[1]), 2), _fallback_duration_min(
                round(_haversine_km(origin[0], origin[1], destination[0], destination[1]), 2)
            )
        params = {
            "origins": f"{origin[0]},{origin[1]}",
            "destinations": f"{destination[0]},{destination[1]}",
            "mode": mode,
            "key": api_key,
        }
        if mode == "driving":
            params["departure_time"] = int(time.time())
            params["traffic_model"] = "best_guess"
        try:
            response = requests.get(GOOGLE_DISTANCE_MATRIX_URL, params=params, timeout=DEFAULT_TIMEOUT_SEC)
            response.raise_for_status()
            payload = response.json()
            rows = payload.get("rows")
            if isinstance(rows, list) and rows:
                elements = rows[0].get("elements") if isinstance(rows[0], dict) else None
                if isinstance(elements, list) and elements:
                    parsed = _parse_element(elements[0])
                    if parsed is not None:
                        distance_km, duration_min = parsed
                        _GOOGLE_CIRCUIT_BREAKER.record_success()
                        _DISTANCE_CACHE.set(key, distance_km, duration_min)
                        return distance_km, duration_min
        except Exception:
            _GOOGLE_CIRCUIT_BREAKER.record_failure()

    distance_km = round(_haversine_km(origin[0], origin[1], destination[0], destination[1]), 2)
    duration_min = _fallback_duration_min(distance_km)
    _DISTANCE_CACHE.set(key, distance_km, duration_min)
    return distance_km, duration_min


def calculate_distance_matrix(technicians, job_lat, job_lon, mode: str = "driving"):
    """
    Calculate travel distance/duration from technicians to job location.

    - Batches up to 25 origins per Google request
    - Validates API response structure
    - Skips invalid technicians and invalid API rows safely
    """
    if mode not in ALLOWED_TRAVEL_MODES:
        raise ValueError(f"Unsupported mode '{mode}'. Allowed: {sorted(ALLOWED_TRAVEL_MODES)}")

    api_key = _resolve_google_maps_api_key()

    destination = f"{float(job_lat)},{float(job_lon)}"
    valid_technicians = [tech for tech in technicians if _is_valid_technician(tech)]

    if not valid_technicians:
        return []

    results = []
    missing = []
    for tech in valid_technicians:
        origin = (float(tech["latitude"]), float(tech["longitude"]))
        key = _cache_key(origin, (float(job_lat), float(job_lon)), mode)
        cached = _DISTANCE_CACHE.get(key)
        if cached:
            distance_km, duration_min = cached
            results.append(
                {
                    "technician_id": int(tech["id"]),
                    "distance_km": distance_km,
                    "duration_min": duration_min,
                    "technician_lat": origin[0],
                    "technician_lon": origin[1],
                }
            )
        else:
            missing.append(tech)

    if api_key and missing:
        with requests.Session() as session:
            for batch in _chunked(missing, MAX_ORIGINS_PER_REQUEST):
                if not _google_api_allowed():
                    break
                params = {
                    "origins": _build_origins(batch),
                    "destinations": destination,
                    "mode": mode,
                    "key": api_key,
                }
                if mode == "driving":
                    params["departure_time"] = int(time.time())
                    params["traffic_model"] = "best_guess"

                try:
                    response = session.get(GOOGLE_DISTANCE_MATRIX_URL, params=params, timeout=DEFAULT_TIMEOUT_SEC)
                    response.raise_for_status()
                    payload = response.json()
                    _GOOGLE_CIRCUIT_BREAKER.record_success()
                except Exception:
                    _GOOGLE_CIRCUIT_BREAKER.record_failure()
                    continue

                rows = payload.get("rows")
                if not isinstance(rows, list) or not rows:
                    continue

                for tech, row in zip(batch, rows):
                    elements = row.get("elements") if isinstance(row, dict) else None
                    if not isinstance(elements, list) or not elements:
                        continue
                    parsed = _parse_element(elements[0])
                    if parsed is None:
                        continue

                    distance_km, duration_min = parsed
                    origin = (float(tech["latitude"]), float(tech["longitude"]))
                    key = _cache_key(origin, (float(job_lat), float(job_lon)), mode)
                    _DISTANCE_CACHE.set(key, distance_km, duration_min)
                    results.append(
                        {
                            "technician_id": int(tech["id"]),
                            "distance_km": distance_km,
                            "duration_min": duration_min,
                            "technician_lat": origin[0],
                            "technician_lon": origin[1],
                        }
                    )

    # Fill any remaining gaps with Haversine fallback.
    seen = {r["technician_id"] for r in results}
    for tech in valid_technicians:
        tech_id = int(tech["id"])
        if tech_id in seen:
            continue
        origin = (float(tech["latitude"]), float(tech["longitude"]))
        distance_km = round(_haversine_km(origin[0], origin[1], float(job_lat), float(job_lon)), 2)
        duration_min = _fallback_duration_min(distance_km)
        key = _cache_key(origin, (float(job_lat), float(job_lon)), mode)
        _DISTANCE_CACHE.set(key, distance_km, duration_min)
        results.append(
            {
                "technician_id": tech_id,
                "distance_km": distance_km,
                "duration_min": duration_min,
                "technician_lat": origin[0],
                "technician_lon": origin[1],
            }
        )

    return results


def calculate_pairwise_distance_matrix(
    points: list[tuple[float, float]],
    mode: str = "driving",
) -> dict | None:
    if mode not in ALLOWED_TRAVEL_MODES:
        raise ValueError(f"Unsupported mode '{mode}'. Allowed: {sorted(ALLOWED_TRAVEL_MODES)}")

    if not points:
        return None

    api_key = _resolve_google_maps_api_key()
    count = len(points)
    distance_matrix_m: list[list[int | None]] = [[None] * count for _ in range(count)]
    duration_matrix_min: list[list[float | None]] = [[None] * count for _ in range(count)]

    # Seed cache hits for known pairs.
    for i, origin in enumerate(points):
        for j, destination in enumerate(points):
            if i == j:
                distance_matrix_m[i][j] = 0
                duration_matrix_min[i][j] = 0.0
                continue
            key = _cache_key(origin, destination, mode)
            cached = _DISTANCE_CACHE.get(key)
            if cached:
                distance_km, duration_min = cached
                distance_matrix_m[i][j] = int(round(distance_km * 1000))
                duration_matrix_min[i][j] = duration_min

    if api_key:
        with requests.Session() as session:
            for origin_chunk_idx in _chunked(list(range(count)), MAX_ORIGINS_PER_REQUEST):
                origin_chunk = [points[idx] for idx in origin_chunk_idx]
                origin_param = "|".join(f"{lat},{lng}" for lat, lng in origin_chunk)
                for dest_chunk_idx in _chunked(list(range(count)), MAX_ORIGINS_PER_REQUEST):
                    dest_chunk = [points[idx] for idx in dest_chunk_idx]
                    dest_param = "|".join(f"{lat},{lng}" for lat, lng in dest_chunk)

                    params = {
                        "origins": origin_param,
                        "destinations": dest_param,
                        "mode": mode,
                        "key": api_key,
                    }
                    if mode == "driving":
                        params["departure_time"] = int(time.time())
                        params["traffic_model"] = "best_guess"

                    try:
                        response = session.get(GOOGLE_DISTANCE_MATRIX_URL, params=params, timeout=DEFAULT_TIMEOUT_SEC)
                        response.raise_for_status()
                        payload = response.json()
                    except Exception:
                        continue

                    rows = payload.get("rows")
                    if not isinstance(rows, list) or not rows:
                        continue

                    for row_idx, row in enumerate(rows):
                        elements = row.get("elements") if isinstance(row, dict) else None
                        if not isinstance(elements, list):
                            continue
                        origin_index = origin_chunk_idx[row_idx]
                        for col_idx, element in enumerate(elements):
                            parsed = _parse_element(element)
                            if parsed is None:
                                continue
                            distance_km, duration_min = parsed
                            dest_index = dest_chunk_idx[col_idx]
                            distance_matrix_m[origin_index][dest_index] = int(round(distance_km * 1000))
                            duration_matrix_min[origin_index][dest_index] = duration_min
                            key = _cache_key(points[origin_index], points[dest_index], mode)
                            _DISTANCE_CACHE.set(key, distance_km, duration_min)

    # Fill remaining gaps with Haversine fallback.
    for i, origin in enumerate(points):
        for j, destination in enumerate(points):
            if distance_matrix_m[i][j] is not None and duration_matrix_min[i][j] is not None:
                continue
            distance_km = round(_haversine_km(origin[0], origin[1], destination[0], destination[1]), 2)
            duration_min = _fallback_duration_min(distance_km)
            distance_matrix_m[i][j] = int(round(distance_km * 1000))
            duration_matrix_min[i][j] = duration_min
            key = _cache_key(origin, destination, mode)
            _DISTANCE_CACHE.set(key, distance_km, duration_min)

    return {
        "distance_matrix_m": distance_matrix_m,
        "duration_matrix_min": duration_matrix_min,
        "source": "google" if api_key else "haversine",
    }