from ai_engine.gemini_diagnosis import analyze_fault
from ai_engine.technician_mapper import map_technician


class DiagnosisEngine:
    """
    Main diagnosis engine that orchestrates AI analysis and technician mapping.
    Uses simplified 2-stage pipeline with HITL triggers.
    """

    def diagnose(self, image_path, description):
        """
        Run 2-stage AI diagnosis and map to technician.
        
        Stage 1: Classification (validation + domain + fault)
        Stage 2: Severity assessment
        """
        
        # Run 2-stage AI analysis
        ai_result = analyze_fault(image_path, description)
        
        # Map to appropriate technician (unless invalid image)
        if ai_result.get("fault_type") != "INVALID_IMAGE":
            technician = map_technician(
                ai_result["fault_type"],
                ai_result["final_severity"]
            )
        else:
            technician = "Customer Service (Invalid submission)"
        
        # Build comprehensive response
        response = {
            # Core diagnosis fields
            "fault_type": ai_result["fault_type"],
            "domain": ai_result.get("domain", "UNKNOWN"),
            "image_severity": ai_result["image_severity"],
            "description_severity": ai_result["description_severity"],
            "final_severity": ai_result["final_severity"],
            "confidence": ai_result["confidence"],
            "recommended_technician": technician,
            "reason": ai_result["reason"],
            
            # Enhanced metadata
            "is_valid_maintenance_image": ai_result.get("is_valid_maintenance_image", True),
            "requires_human_review": ai_result.get("requires_human_review", False),
            "review_priority": ai_result.get("review_priority", "normal"),
            "hitl_triggers": ai_result.get("hitl_triggers", []),
            
            # Detailed reasoning
            "domain_reasoning": ai_result.get("domain_reasoning", ""),
            "fault_reasoning": ai_result.get("fault_reasoning", ""),
            "image_reasoning": ai_result.get("image_reasoning", ""),
            "description_reasoning": ai_result.get("description_reasoning", ""),
            
            # Risk assessment
            "safety_score": ai_result.get("safety_score", 0),
            "operational_impact": ai_result.get("operational_impact", 0),
            "escalation_risk": ai_result.get("escalation_risk", 0),
            
            # Validation metadata
            "is_listed_fault": ai_result.get("is_listed_fault", True),
            "correction_applied": ai_result.get("correction_applied", False),
            "original_fault_type": ai_result.get("original_fault_type"),
            "safety_escalation": ai_result.get("safety_escalation", False),
            "detected_keywords": ai_result.get("detected_keywords", []),
            "final_reasoning": ai_result.get("final_reasoning", ai_result.get("reason", ""))
        }
        
        return response