import { Outlet } from "react-router";

/**
 * AuthLayout — wraps all unauthenticated screens (Login, Register, Forgot Password).
 * Centers the fixed-width (390px) mobile frame on a dark branded background.
 */
export function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        backgroundColor: "#0A1628",
        paddingTop: "32px",
        paddingBottom: "32px",
        overflowX: "auto",
      }}
    >
      <Outlet />
    </div>
  );
}
