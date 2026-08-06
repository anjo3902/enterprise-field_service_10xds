from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Optional, Tuple

import requests

from dispatch_engine.service_zones import SERVICE_ZONES

KERALA_LAT_MIN = 8.0
KERALA_LAT_MAX = 12.8
KERALA_LNG_MIN = 74.8
KERALA_LNG_MAX = 77.5

_ZONE_COORDINATE_OVERRIDES = {
    "Ernakulam": (9.9816, 76.2999),
    "Thrissur": (10.5276, 76.2144),
    "Kozhikode": (11.2588, 75.7804),
    "Kottayam": (9.5916, 76.5222),
    "Trivandrum": (8.5241, 76.9366),
}


def _normalize_zone(zone: str) -> str:
    return " ".join(str(zone or "").strip().lower().split())


def _build_zone_lookup() -> dict[str, tuple[float, float]]:
    lookup: dict[str, tuple[float, float]] = {}
    for name, coords in SERVICE_ZONES.items():
        lookup[_normalize_zone(name)] = coords
    for name, coords in _ZONE_COORDINATE_OVERRIDES.items():
        lookup[_normalize_zone(name)] = coords
    return lookup


_ZONE_LOOKUP = _build_zone_lookup()


def is_valid_kerala_coordinate(lat: float | int | None, lng: float | int | None) -> bool:
    if lat is None or lng is None:
        return False
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return False
    if not math.isfinite(lat_f) or not math.isfinite(lng_f):
        return False
    return KERALA_LAT_MIN <= lat_f <= KERALA_LAT_MAX and KERALA_LNG_MIN <= lng_f <= KERALA_LNG_MAX


def _get_google_maps_key() -> Optional[str]:
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if key:
        return key.strip()

    env_file = Path(__file__).resolve().parents[1] / "frontend" / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("VITE_GOOGLE_MAPS_API_KEY="):
                return line.split("=", 1)[1].strip()

    return None


def _geocode_zone(zone: str) -> Optional[Tuple[float, float]]:
    key = _get_google_maps_key()
    if not key or key == "your_google_maps_api_key_here":
        return None

    query = f"{zone}, Kerala, India"
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    try:
        res = requests.get(url, params={"address": query, "key": key}, timeout=20)
        if res.status_code >= 400:
            return None
        data = res.json()
        if data.get("status") != "OK":
            return None
        results = data.get("results") or []
        if not results:
            return None
        loc = results[0].get("geometry", {}).get("location", {})
        lat = loc.get("lat")
        lng = loc.get("lng")
        if lat is None or lng is None:
            return None
        if not is_valid_kerala_coordinate(lat, lng):
            return None
        return float(lat), float(lng)
    except requests.RequestException:
        return None


def get_coordinates_from_zone(zone: str | None) -> Optional[Tuple[float, float]]:
    if not zone:
        return None
    normalized = _normalize_zone(zone)
    if not normalized:
        return None

    coords = _ZONE_LOOKUP.get(normalized)
    if coords:
        return float(coords[0]), float(coords[1])

    return _geocode_zone(zone)
