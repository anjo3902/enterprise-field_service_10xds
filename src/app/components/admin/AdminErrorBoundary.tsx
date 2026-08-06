import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import { adminTokens as tokens } from "../../theme/adminTokens";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdminErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "24px",
          backgroundColor: tokens.bg,
          textAlign: "center"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px"
          }}>
            <AlertOctagon size={32} color="#DC2626" />
          </div>
          
          <h1 style={{
            fontSize: "20px",
            fontWeight: 800,
            color: tokens.ink,
            margin: "0 0 12px",
            fontFamily: "'Inter', sans-serif"
          }}>
            Something went wrong
          </h1>
          
          <p style={{
            fontSize: "14px",
            color: tokens.inkSec,
            margin: "0 0 32px",
            lineHeight: 1.5,
            fontFamily: "'Inter', sans-serif"
          }}>
            A runtime error occurred in the Admin module. Our engineering team has been notified.
          </p>

          <div style={{
            backgroundColor: tokens.card,
            padding: "16px",
            borderRadius: "12px",
            border: `1px solid ${tokens.border}`,
            width: "100%",
            marginBottom: "32px",
            textAlign: "left",
            overflowX: "auto"
          }}>
            <p style={{
              fontSize: "12px",
              fontFamily: "monospace",
              color: "#DC2626",
              margin: 0
            }}>
              {this.state.error?.message || "Unknown error"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", width: "100%" }}>
            <button
              onClick={() => window.location.href = "/admin/dashboard"}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: tokens.card,
                color: tokens.ink,
                border: `1px solid ${tokens.border}`,
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <Home size={18} />
              Dashboard
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: tokens.primary,
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <RotateCcw size={18} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
