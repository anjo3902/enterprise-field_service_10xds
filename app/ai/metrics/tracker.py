"""
app/ai/metrics/tracker.py
─────────────────────────────────────────────────────────────────────────────
Tracks token usage, execution latency, and cost per agent/workflow.
"""
from typing import Dict, Any
from app.ai.utils.logger import get_logger
from collections import defaultdict
import time

logger = get_logger("ai.metrics.tracker")

class MetricsTracker:
    """In-memory telemetry store. Replace with time-series DB in production."""
    
    def __init__(self):
        self.agent_metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "invocations": 0,
            "total_tokens": 0,
            "total_latency_ms": 0,
            "errors": 0
        })

    def track_execution(self, agent_name: str, tokens: int, latency_ms: float, success: bool):
        metrics = self.agent_metrics[agent_name]
        metrics["invocations"] += 1
        metrics["total_tokens"] += tokens
        metrics["total_latency_ms"] += latency_ms
        if not success:
            metrics["errors"] += 1
            
        logger.info(
            f"METRICS [Agent: {agent_name}]: {tokens} tokens, {latency_ms:.2f}ms, success={success}"
        )

    def get_report(self) -> Dict[str, Any]:
        """Calculates average latency and mock cost mappings."""
        report = {}
        for agent, m in self.agent_metrics.items():
            avg_lat = m["total_latency_ms"] / m["invocations"] if m["invocations"] > 0 else 0
            # Mock cost: $0.0001 per token for reporting
            cost = m["total_tokens"] * 0.0001
            
            report[agent] = {
                "invocations": m["invocations"],
                "total_tokens": m["total_tokens"],
                "avg_latency_ms": round(avg_lat, 2),
                "error_rate": round(m["errors"] / m["invocations"], 2) if m["invocations"] > 0 else 0,
                "estimated_cost_usd": round(cost, 4)
            }
        return report

# Global metrics tracker
metrics_tracker = MetricsTracker()
