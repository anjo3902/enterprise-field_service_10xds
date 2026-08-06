export function getHealthStatus(healthScore: number) {
  if (healthScore < 60) {
    return "Critical";
  }

  if (healthScore < 80) {
    return "Warning";
  }

  return "Healthy";
}