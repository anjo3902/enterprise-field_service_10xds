import { Outlet } from "react-router";
import { TechnicianProvider } from "../contexts/TechnicianContext";

/**
 * TechnicianLayout — wraps all technician screens.
 * Centers the fixed-width (390px) mobile frame on a dark branded background.
 * Provides TechnicianContext derived from VendorContext.
 */
export function TechnicianLayout() {
  return (
    <TechnicianProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A1628", // Match VendorLayout for seamless transition
          overflowX: "auto",
        }}
      >
        <Outlet />
      </div>
    </TechnicianProvider>
  );
}
