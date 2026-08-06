import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { BackHeader } from "../../components/navigation/BackHeader";
import { AdminActionFooter } from "../../components/admin/shared/AdminActionFooter";
import { adminTokens as tokens } from "../../theme/adminTokens";

export default function OrganizationCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else navigate('/admin/organizations'); // Mock save
  };

  return (
    <MobileLayout showBottomNav={false} backgroundColor={tokens.bg} header={<BackHeader title="Add Organization" fallbackRoute="/admin/organizations" />}>
      <div style={{ padding: "20px" }}>
        
        {/* Wizard Progress */}
        <div className="flex items-center justify-between mb-8">
           {[1,2,3].map(s => (
             <React.Fragment key={s}>
               <div style={{ width: "32px", height: "32px", borderRadius: "16px", backgroundColor: s <= step ? tokens.primary : tokens.border, color: s <= step ? "white" : tokens.inkSec, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
                 {s}
               </div>
               {s < 3 && <div style={{ flex: 1, height: "2px", backgroundColor: s < step ? tokens.primary : tokens.border, margin: "0 8px" }} />}
             </React.Fragment>
           ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Organization Details</h2>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Organization Name</label>
              <input type="text" placeholder="Acme Corp" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Region</label>
              <select style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px", backgroundColor: "white" }}>
                <option>North America</option>
                <option>Europe</option>
                <option>Asia Pacific</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Primary Admin</h2>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Full Name</label>
              <input type="text" placeholder="Jane Doe" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: tokens.inkSec, display: "block", marginBottom: "6px" }}>Email Address</label>
              <input type="email" placeholder="jane@acmecorp.com" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${tokens.border}`, fontSize: "14px" }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Subscription Plan</h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {["Basic", "Professional", "Enterprise"].map((plan, i) => (
                <div key={plan} style={{ padding: "16px", borderRadius: "12px", border: `2px solid ${i === 2 ? tokens.primary : tokens.border}`, backgroundColor: i === 2 ? "#E6F0FF" : "white", cursor: "pointer" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: i === 2 ? tokens.primary : tokens.ink }}>{plan}</div>
                  <div style={{ fontSize: "13px", color: tokens.inkSec, marginTop: "4px" }}>{i === 0 ? "Up to 10 users" : i === 1 ? "Up to 50 users" : "Unlimited users"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AdminActionFooter>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "14px", backgroundColor: "white", border: `1px solid ${tokens.border}`, borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: tokens.inkSec, cursor: "pointer" }}>Back</button>
          )}
          <button onClick={handleNext} style={{ flex: 2, padding: "14px", backgroundColor: tokens.primary, border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 600, color: "white", cursor: "pointer" }}>
            {step === 3 ? "Create Organization" : "Continue"}
          </button>
        </AdminActionFooter>
      </div>
    </MobileLayout>
  );
}
