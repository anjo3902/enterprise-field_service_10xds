import { Outlet } from "react-router";

/**
 * AppLayout — wraps all authenticated screens (Dashboard, Assets, Tickets, etc.).
 * Centers the fixed-width (390px) mobile frame on a dark branded background.
 * Add auth guards here in a future phase.
 */
export function AppLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A1628",
        overflowX: "auto",
      }}
    >
      <Outlet />
    </div>
  );
}
