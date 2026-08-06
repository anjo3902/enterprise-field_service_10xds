"""
dispatch_engine/route_state_manager.py — In-memory route cache & safety controls.

Responsibilities:
  1. Cache the last DVRP-optimized routes so we don't recompute every cycle.
  2. Enforce a cooldown period between consecutive global optimizations.
  3. Track per-request reroute counts to prevent reroute storms.
  4. Decide whether conditions warrant a DVRP run ("should_optimize").

Thread-safety: all mutable state is guarded by a single lock so the
background priority monitor can call safely from its daemon thread.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

# Minimum seconds between two DVRP optimizations.
COOLDOWN_SECONDS: int = 30

# A request may only be rerouted this many times (across the lifetime of the
# process — restarting the server resets the counter, which is intentional).
MAX_REROUTES_PER_REQUEST: int = 1

# When the number of active un-optimized requests exceeds this threshold the
# system will escalate from single-request rerouting to a full DVRP pass.
LOAD_THRESHOLD: int = 5

# ---------------------------------------------------------------------------
# Internal state (module-level, guarded by _lock)
# ---------------------------------------------------------------------------

_lock = threading.Lock()

# Timestamp of the last successful DVRP optimization (epoch seconds).
_last_optimization_ts: float = 0.0

# Cached result from the most recent DVRP run.
# Shape: same as the return of dvrp_optimizer.optimize_routes().
_cached_routes: dict[str, Any] | None = None

# Counter: request_id → number of times it has been rerouted.
_reroute_counts: dict[str, int] = {}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def should_optimize(
    *,
    has_critical: bool = False,
    pending_count: int = 0,
) -> bool:
    """Return True when conditions justify a full DVRP pass.

    A DVRP run is triggered when:
      - A new critical request has arrived, OR
      - The number of pending un-optimized requests >= LOAD_THRESHOLD

    AND the cooldown period has elapsed since the last run.
    """
    with _lock:
        if not has_critical and pending_count < LOAD_THRESHOLD:
            return False
        elapsed = time.time() - _last_optimization_ts
        if elapsed < COOLDOWN_SECONDS:
            LOGGER.debug(
                "[DVRP-CACHE] Cooldown active — %.0fs remaining",
                COOLDOWN_SECONDS - elapsed,
            )
            return False
        return True


def record_optimization(routes: dict[str, Any] | None) -> None:
    """Store the latest DVRP result and reset the cooldown timer."""
    global _last_optimization_ts, _cached_routes
    with _lock:
        _last_optimization_ts = time.time()
        _cached_routes = routes


def get_cached_routes() -> dict[str, Any] | None:
    """Return the most recently cached DVRP result (or None)."""
    with _lock:
        return _cached_routes


def can_reroute_request(request_id: str) -> bool:
    """Return True if the request hasn't exceeded its reroute limit."""
    with _lock:
        return _reroute_counts.get(request_id, 0) < MAX_REROUTES_PER_REQUEST


def record_reroute(request_id: str) -> None:
    """Increment the reroute counter for a request."""
    with _lock:
        _reroute_counts[request_id] = _reroute_counts.get(request_id, 0) + 1


def get_reroute_count(request_id: str) -> int:
    """Return how many times a request has been rerouted."""
    with _lock:
        return _reroute_counts.get(request_id, 0)
