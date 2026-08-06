import React, { useEffect, useRef } from "react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  icon?: React.ElementType;
  iconColor?: string;
  iconTint?: string;
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  confirmColor: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  isDestructive?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  icon: Icon,
  iconColor = "#DC2626",
  iconTint = "#FEF2F2",
  title,
  message,
  detail,
  confirmLabel,
  confirmColor,
  cancelLabel = "Cancel",
  onConfirm,
  isLoading = false,
  isDestructive = false,
  children,
}: ConfirmationDialogProps & { children?: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Focus first element on open
    setTimeout(() => {
      if (dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    }, 10);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "340px",
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          border: isDestructive ? "2px solid #FEF2F2" : "none",
          animation: "slideUp 0.2s ease-out",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        
        {Icon && (
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "28px",
              backgroundColor: iconTint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <Icon size={28} color={iconColor} />
          </div>
        )}
        
        <h3
          id="dialog-title"
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0F172A",
            margin: "0 0 8px 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {title}
        </h3>
        
        <p
          id="dialog-description"
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#475569",
            margin: "0 0 16px 0",
            lineHeight: 1.5,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {message}
        </p>
        
        {detail && (
          <p
            style={{
              fontSize: "12px",
              fontWeight: 400,
              color: "#94A3B8",
              margin: "0 0 24px 0",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {detail}
          </p>
        )}

        {children && (
          <div style={{ width: "100%", marginBottom: "24px", textAlign: "left" }}>
            {children}
          </div>
        )}
        
        <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: (detail || children) ? 0 : "8px" }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "transparent",
              border: "1px solid #E2E8F0",
              color: "#475569",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              height: "48px",
              borderRadius: "12px",
              backgroundColor: confirmColor,
              border: "none",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isLoading && (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
