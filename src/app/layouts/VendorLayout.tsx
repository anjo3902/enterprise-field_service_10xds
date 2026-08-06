import { Outlet } from "react-router";

/**
 * VendorLayout — wraps all vendor screens.
 * Centers the fixed-width (390px) mobile frame on a dark branded background.
 */
export function VendorLayout() {
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
