import { motion } from 'framer-motion'
import { AlertTriangle, User, Wrench, Activity, Shield, FileText, CheckCircle, AlertCircle, CheckCircle2, XCircle, Lightbulb } from 'lucide-react'

const getSeverityBadgeClass = (severity) => {
  if (!severity || severity.toLowerCase() === 'n/a') return 'bg-gray-100 text-gray-500 border border-gray-300'
  
  const severityLower = severity?.toLowerCase() || 'low'
  const classes = {
    low: 'badge-low',
    medium: 'badge-medium',
    high: 'badge-high',
    critical: 'badge-critical'
  }
  return classes[severityLower] || 'badge-low'
}

const ResultCard = ({ icon: Icon, label, value, isSeverity = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="bg-accent/10 p-2 rounded-lg">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-secondary font-medium">{label}</p>
          {isSeverity ? (
            <span className={`badge ${getSeverityBadgeClass(value)} mt-2 inline-block`}>
              {value || 'N/A'}
            </span>
          ) : (
            <p className="text-lg font-semibold text-primary mt-1">
              {value || 'N/A'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const EmptyState = () => {
  return (
    <div className="card p-12 text-center">
      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Activity className="w-8 h-8 text-secondary" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-2">
        No Diagnosis Yet
      </h3>
      <p className="text-secondary text-sm">
        Fill in the form and click "Analyze Issue" to get AI-powered diagnosis
      </p>
    </div>
  )
}

const DiagnosisResult = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="text-secondary mt-4 font-medium">Analyzing issue...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return <EmptyState />
  }

  // Handle invalid/rejected images
  if (result.fault_type === 'INVALID_IMAGE') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {/* Error Header */}
        <div className="card p-6 border-2 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900 mb-2">
                Image Rejected - Not a Maintenance Issue
              </h2>
              <p className="text-sm text-red-700">
                {result.rejection_reason || result.reason || 'The uploaded image does not appear to be a facility maintenance issue.'}
              </p>
            </div>
          </div>
        </div>

        {/* What was detected */}
        {result.detected_elements && (
          <div className="card p-6 bg-orange-50 border border-orange-200">
            <h3 className="text-sm font-semibold text-orange-900 mb-2">
              What We Detected:
            </h3>
            <p className="text-sm text-orange-800">
              {result.detected_elements}
            </p>
          </div>
        )}

        {/* Acceptable images guide */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Acceptable Images:
          </h3>
          <ul className="text-sm text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Damaged equipment or infrastructure (pipes, wiring, HVAC units)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Water leaks, electrical issues, fire safety concerns</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Broken fixtures, structural damage, HVAC malfunctions</span>
            </li>
          </ul>

          <h3 className="text-sm font-semibold text-primary mb-3 mt-6 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            Not Acceptable:
          </h3>
          <ul className="text-sm text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>Software screenshots (VS Code, browsers, mobile apps)</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>Pictures of people, animals, food, or unrelated objects</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>Text documents, diagrams without actual damage</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>Images without any visible maintenance issues</span>
            </li>
          </ul>
        </div>

        {/* Try again button */}
        <div className="card p-6 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
            Please upload a photo of the actual facility maintenance issue and try again.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >      {/* Human Review Required Warning */}
      {result.requires_human_review && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 border-2 border-yellow-400 bg-yellow-50"
        >
          <div className="flex items-start gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                Manual Review Required ({result.review_priority?.toUpperCase() || 'MEDIUM'} Priority)
              </h2>
              <p className="text-sm text-yellow-800 mb-3">
                This diagnosis requires human verification before dispatch.
              </p>
              {result.hitl_triggers && result.hitl_triggers.length > 0 && (() => {
                const TRIGGER_LABELS = {
                  LOW_CONFIDENCE:                  'Low confidence — AI verification score below threshold, human review recommended',
                  INVALID_IMAGE:                   'Invalid image — please resubmit with a clear maintenance photo',
                  UNLISTED_FAULT:                  'Unlisted fault type with low confidence — admin category review required',
                  CRITICAL_REQUIRES_VERIFICATION:  'Critical severity — administrator authorisation required before dispatch',
                  SAFETY_ESCALATION:               'Safety escalation — elevated risk keywords detected (flooding, sparks, etc.)',
                }
                const ALIAS = {
                  LOW_CONFIDENCE_CLASSIFICATION:  'LOW_CONFIDENCE',
                  INVALID_MAINTENANCE_IMAGE:      'INVALID_IMAGE',
                  UNLISTED_FAULT_LOW_CONFIDENCE:  'UNLISTED_FAULT',
                  CRITICAL_SEVERITY_REVIEW:       'CRITICAL_REQUIRES_VERIFICATION',
                  SEVERITY_POLICY_REVIEW:         'CRITICAL_REQUIRES_VERIFICATION',
                }
                const resolve = (t) => {
                  const raw = typeof t === 'string' ? t : t?.type || ''
                  return ALIAS[raw] ?? raw
                }
                const knownTriggers = result.hitl_triggers.filter((t) => TRIGGER_LABELS[resolve(t)])
                if (knownTriggers.length === 0) return null
                return (
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-2">Why this needs review:</p>
                    <ul className="text-xs text-yellow-800 space-y-1">
                      {knownTriggers.map((trigger, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                          <span>{TRIGGER_LABELS[resolve(trigger)]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </div>
          </div>
        </motion.div>
      )}
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-success/10 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-success" />
          </div>
          <h2 className="text-xl font-bold text-primary">
            Diagnosis Complete
          </h2>
        </div>
        <p className="text-sm text-secondary ml-12">
          AI analysis has been completed successfully
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultCard
          icon={Wrench}
          label="Domain"
          value={result.domain?.replace(/_/g, ' ')}
        />
        
        <ResultCard
          icon={Wrench}
          label="Fault Type"
          value={result.fault_type?.replace(/_/g, ' ')}
        />
        
        <ResultCard
          icon={AlertTriangle}
          label="Image Severity"
          value={result.image_severity}
          isSeverity={true}
        />
        
        <ResultCard
          icon={AlertTriangle}
          label="Description Severity"
          value={result.description_severity}
          isSeverity={true}
        />
        
        <ResultCard
          icon={AlertTriangle}
          label="Final Severity"
          value={result.final_severity}
          isSeverity={true}
        />
        
        <ResultCard
          icon={Activity}
          label="Confidence Score"
          value={result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : 'N/A'}
        />
      </div>

      {/* Risk Assessment Scores */}
      {(result.safety_score !== undefined || result.operational_impact !== undefined || result.escalation_risk !== undefined) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risk Assessment (0-5 scale)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-secondary mb-1">Safety Risk</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${(result.safety_score || 0) * 20}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary">{result.safety_score || 0}/5</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-secondary mb-1">Operational Impact</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(result.operational_impact || 0) * 20}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary">{result.operational_impact || 0}/5</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-secondary mb-1">Escalation Risk</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${(result.escalation_risk || 0) * 20}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary">{result.escalation_risk || 0}/5</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Reasoning */}
      {(result.final_reasoning || result.image_reasoning || result.description_reasoning) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-6"
        >
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            AI Analysis Reasoning
          </h3>
          
          {result.final_reasoning && (
            <div className="mb-4">
              <p className="text-xs text-secondary font-semibold mb-1">Overall Assessment:</p>
              <p className="text-sm text-primary leading-relaxed">{result.final_reasoning}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.image_reasoning && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-secondary font-semibold mb-1">From Image:</p>
                <p className="text-xs text-primary leading-relaxed">{result.image_reasoning}</p>
              </div>
            )}
            
            {result.description_reasoning && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-secondary font-semibold mb-1">From Description:</p>
                <p className="text-xs text-primary leading-relaxed">{result.description_reasoning}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Auto-Correction & Safety Escalation Alerts */}
      {(result.correction_applied || result.safety_escalation) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {result.correction_applied && (
            <div className="card p-4 border-2 border-blue-200 bg-blue-50">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Auto-Corrected</p>
                  <p className="text-xs text-blue-700">
                    Original: <span className="font-mono">{result.original_fault_type}</span>
                  </p>
                  <p className="text-xs text-blue-700">
                    Corrected: <span className="font-mono">{result.fault_type}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {result.safety_escalation && (
            <div className="card p-4 border-2 border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">Safety Escalated</p>
                  {result.detected_keywords && result.detected_keywords.length > 0 && (
                    <p className="text-xs text-red-700">
                      Keywords: {result.detected_keywords.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Recommended Technician */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20"
      >
        <div className="flex items-start gap-4">
          <div className="bg-accent p-3 rounded-lg">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-secondary font-medium mb-1">
              Recommended Technician
            </p>
            <p className="text-2xl font-bold text-primary">
              {result.recommended_technician || 'Not Assigned'}
            </p>
            <p className="text-xs text-secondary mt-2">
              This technician has been selected based on fault type and availability
            </p>
          </div>
        </div>
      </motion.div>


    </motion.div>
  )
}

export default DiagnosisResult
