import React, { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";

interface MobileLayoutProps {
  /** The main scrollable content */
  children: ReactNode;
  /** Fixed top header content (StatusBar, PageHeader, etc.) */
  header?: ReactNode;
  /** Absolute positioning layer for modals and overlays */
  modals?: ReactNode;
  /** Background color of the container, defaults to #F8FAFC (bg) or explicitly passed */
  backgroundColor?: string;
  /** Whether to show the BottomNavigation. Defaults to true. */
  showBottomNav?: boolean;
  /** Custom Bottom Navigation element to override the default */
  bottomNav?: ReactNode;
  /** Floating Action Button (FAB) or similar absolute overlay elements within the container but below modals */
  fab?: ReactNode;
  /** Custom styles for the scrollable container. Useful for overriding padding. Defaults to paddingBottom: 100px. */
  scrollContainerStyle?: React.CSSProperties;
}

export function MobileLayout({
  children,
  header,
  modals,
  backgroundColor = "#F8FAFC",
  showBottomNav = true,
  bottomNav,
  fab,
  scrollContainerStyle
}: MobileLayoutProps) {
  return (
    <div style={{ 
      width: "390px", 
      height: "844px", 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor, 
      overflow: "hidden", 
      fontFamily: "'Inter', 'Roboto', sans-serif", 
      position: "relative" 
    }}>
      
      {/* ── Fixed top chrome ── */}
      {header}

      {/* ── Scrollable body ── */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: "auto", 
          scrollbarWidth: "none", 
          paddingBottom: "100px", 
          ...scrollContainerStyle 
        }}
      >
        {children}
      </div>

      {/* ── FAB ── */}
      {fab}

      {/* ── Fixed bottom chrome ── */}
      {bottomNav !== undefined ? bottomNav : (showBottomNav && <BottomNavigation />)}
      <div style={{ height: "22px", backgroundColor: (bottomNav || showBottomNav) ? "#FFFFFF" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
        <div style={{ width: "134px", height: "5px", backgroundColor: "#0F172A", borderRadius: "100px", opacity: (bottomNav || showBottomNav) ? 0.1 : 0.15 }} />
      </div>

      {/* ── Modals / Overlays ── */}
      {modals}
    </div>
  );
}
