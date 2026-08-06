import { useNavigate } from "react-router";

/**
 * NotFoundPage — displayed for any unmatched route.
 * Styled to match the app's dark brand background.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A1628",
        fontFamily: "'Inter', 'Roboto', sans-serif",
        gap: "16px",
      }}
    >
      <p style={{ fontSize: "72px", margin: 0, lineHeight: 1 }}>404</p>
      <p style={{ fontSize: "18px", fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: 0 }}>
        Page not found
      </p>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          marginTop: "8px",
          height: "44px",
          borderRadius: "12px",
          padding: "0 28px",
          background: "linear-gradient(135deg, #0065FF, #0052CC)",
          border: "none",
          color: "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Go to Login
      </button>
    </div>
  );
}
