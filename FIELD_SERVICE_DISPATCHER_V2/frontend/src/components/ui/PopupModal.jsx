import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const TYPE_COLORS = {
  success: "#22c55e",
  error: "#ef4444",
  warning: "#eab308",
  confirm: "#2563eb",
};

export default function PopupModal({
  type = "success",
  title = "",
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  onClose,
  onConfirm,
  onCancel,
}) {
  const overlayRef = useRef();

  // ESC to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    <div
      ref={overlayRef}
      className="popup-overlay"
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s",
      }}
    >
      <div
        className="popup-modal"
        style={{
          minWidth: 320,
          maxWidth: 400,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: 28,
          textAlign: "center",
          animation: "popupIn 0.2s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 12px",
            borderRadius: "50%",
            background: TYPE_COLORS[type] + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: TYPE_COLORS[type],
          }}
        >
          {type === "success" && "✔"}
          {type === "error" && "✖"}
          {type === "warning" && "!"}
          {type === "confirm" && "?"}
        </div>
        <h3 style={{ margin: "0 0 8px", fontWeight: 600 }}>{title}</h3>
        <div style={{ marginBottom: 20, color: "#444" }}>{message}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {type === "confirm" || type === "warning" ? (
            <>
              <button
                onClick={onCancel}
                style={buttonStyle("#e5e7eb", "#111")}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                style={buttonStyle(TYPE_COLORS[type], "#fff")}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={buttonStyle(TYPE_COLORS[type], "#fff")}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popupIn { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}

function buttonStyle(bg, color) {
  return {
    background: bg,
    color,
    border: "none",
    borderRadius: 6,
    padding: "10px 22px",
    fontWeight: 500,
    fontSize: 16,
    cursor: "pointer",
    transition: "background 0.15s",
    outline: "none",
  };
}

PopupModal.propTypes = {
  type: PropTypes.oneOf(["success", "error", "warning", "confirm"]),
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};
