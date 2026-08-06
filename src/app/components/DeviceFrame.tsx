interface Props {
  children: React.ReactNode;
  label: string;
  step?: string;
}

export function DeviceFrame({ children, label, step }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {step && (
          <span
            style={{
              fontSize: "10px", color: "rgba(100,168,255,0.6)", fontFamily: "'Roboto', sans-serif",
              fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const,
              backgroundColor: "rgba(0,101,255,0.12)",
              border: "1px solid rgba(0,101,255,0.2)",
              borderRadius: "100px", padding: "2px 8px",
            }}
          >
            {step}
          </span>
        )}
        <span
          style={{
            fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Roboto', sans-serif",
            fontWeight: 500, letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>

      <div
        className="relative flex flex-col"
        style={{
          width: "414px",
          borderRadius: "44px",
          background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
          padding: "12px",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            0 2px 4px rgba(0,0,0,0.5),
            0 8px 16px rgba(0,0,0,0.4),
            0 24px 48px rgba(0,0,0,0.35),
            0 48px 80px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.4)
          `,
        }}
      >
        {/* Power button */}
        <div className="absolute" style={{ right: "-4px", top: "130px", width: "4px", height: "64px", background: "linear-gradient(90deg, #2A2A3E, #1A1A2E)", borderRadius: "0 4px 4px 0", boxShadow: "2px 0 4px rgba(0,0,0,0.4)" }} />
        {/* Volume up */}
        <div className="absolute" style={{ left: "-4px", top: "120px", width: "4px", height: "36px", background: "linear-gradient(270deg, #2A2A3E, #1A1A2E)", borderRadius: "4px 0 0 4px", boxShadow: "-2px 0 4px rgba(0,0,0,0.4)" }} />
        {/* Volume down */}
        <div className="absolute" style={{ left: "-4px", top: "168px", width: "4px", height: "36px", background: "linear-gradient(270deg, #2A2A3E, #1A1A2E)", borderRadius: "4px 0 0 4px", boxShadow: "-2px 0 4px rgba(0,0,0,0.4)" }} />

        <div style={{ borderRadius: "34px", overflow: "hidden", position: "relative" }}>
          {/* Punch-hole camera */}
          <div className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none" style={{ paddingTop: "14px" }}>
            <div style={{ width: "120px", height: "34px", backgroundColor: "#000", borderRadius: "0 0 20px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#1A1A2E", border: "2px solid #2A2A3E" }} />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
