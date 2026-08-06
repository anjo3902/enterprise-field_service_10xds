/**
 * shared/ai/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Provider-agnostic AI orchestration interface.
 * Abstracts OpenAI, Gemini, Claude, Groq interactions.
 * Note: Uses mock logic for demonstration to avoid hardcoding API keys,
 * but adheres to the exact schema and observability patterns requested.
 */

export interface AiInferenceRequest {
  model?: string; // Standardized model identifier (e.g. "gemini-pro", "gpt-4o")
  prompt: string;
  context?: Record<string, any>;
  temperature?: number;
}

export interface AiInferenceResult {
  output: Record<string, any>;
  confidence: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

/**
 * Simulates a provider-agnostic AI inference call.
 */
export async function invokeAiModel(request: AiInferenceRequest): Promise<AiInferenceResult> {
  const start = Date.now();
  
  // Simulate network latency (200ms - 800ms)
  const delay = Math.floor(Math.random() * 600) + 200;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Return dummy data matching the requested domain
  // In a real implementation, this would switch on configuration to call Google ADK/OpenRouter
  let output: Record<string, any> = {};
  let confidence = Math.random() * (0.98 - 0.75) + 0.75; // Mostly high confidence

  // Force low confidence for HITL testing if specific keywords exist
  if (request.prompt.includes("UNKNOWN") || request.prompt.includes("FORCE_HITL")) {
    confidence = 0.45; 
  }

  if (request.prompt.includes("diagnosis")) {
    output = {
      diagnosis: "HVAC Compressor Failure",
      severity: "High",
      recommended_action: "Replace compressor unit and check coolant lines.",
      root_cause: "Wear and tear over 5 years without proper lubrication."
    };
  } else if (request.prompt.includes("priority")) {
    output = {
      recommended_priority: "Critical",
      sla_level: "SLA-4HR",
      business_impact: "High impact due to data center temperature rise.",
      operational_risk: "Critical"
    };
  } else if (request.prompt.includes("dispatch")) {
    output = {
      vendor_id_recommended: "mock-vendor-1",
      technician_id_recommended: "mock-tech-1",
      schedule_recommendation: new Date().toISOString(),
      route_optimization_score: 0.92,
      reason: "Technician is nearest and has HVAC certification."
    };
  } else if (request.prompt.includes("inventory")) {
    output = {
      required_parts: [{ part_name: "Compressor Unit X-200", quantity: 1 }],
      alternatives: [{ part_name: "Compressor Unit X-250", quantity: 1 }],
      availability_status: "In Stock"
    };
  } else if (request.prompt.includes("maintenance")) {
    output = {
      predicted_failure_date: new Date(Date.now() + 90 * 86400000).toISOString(),
      remaining_useful_life_days: 90,
      recommended_preventive_action: "Schedule lubrication and vibration analysis."
    };
  } else {
    output = { generic_response: "Acknowledged." };
  }

  const latency_ms = Date.now() - start;

  return {
    output,
    confidence: Number(confidence.toFixed(3)),
    input_tokens: request.prompt.length,
    output_tokens: JSON.stringify(output).length,
    latency_ms,
  };
}
