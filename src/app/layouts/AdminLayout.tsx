import { Outlet } from "react-router";
import { AdminProvider } from "../contexts/AdminContext";
import { AdminErrorBoundary } from "../components/admin/AdminErrorBoundary";
import { AdminBottomNavigation } from "../components/admin/AdminBottomNavigation";

/**
 * AdminLayout — wraps all system admin screens.
 * Centers the fixed-width (390px) mobile frame on a dark branded background.
 * Provides AdminContext scoped only to admin routes.
 */
export function AdminLayout() {
  return (
    <AdminProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A1628", // Matches Vendor/Tech layout background
          overflowX: "auto",
        }}
      >
        <AdminErrorBoundary>
          <div style={{ width: "390px", height: "844px", position: "relative", overflow: "hidden", backgroundColor: "#F8FAFC" }}>
            <Outlet />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
              <AdminBottomNavigation />
            </div>
          </div>
        </AdminErrorBoundary>
      </div>
    </AdminProvider>
  );
}
