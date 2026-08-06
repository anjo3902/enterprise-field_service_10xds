import React, { useState } from "react";
import { useNavigate } from "react-router";
import { MobileLayout } from "../ui/MobileLayout";
import { BackHeader } from "../navigation/BackHeader";
import { useVendor } from "../../contexts/VendorContext";

// Design tokens
const blue     = "#2563EB";
const green    = "#16A34A";
const ink      = "#0F172A";
const inkSec   = "#475569";
const inkMut   = "#64748B";
const bg       = "#F8FAFC";
const card     = "#FFFFFF";
const border   = "#E2E8F0";
const inter    = "'Inter', 'Roboto', sans-serif";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";

const InputField = ({ label, name, value, readOnly = false, type = "text", isEditing, onChange }: any) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: inkSec, marginBottom: "6px", fontFamily: inter, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={!isEditing || readOnly}
      style={{
        width: "100%", padding: "14px 16px",
        backgroundColor: (!isEditing || readOnly) ? "#F8FAFC" : card,
        border: `1px solid ${(!isEditing || readOnly) ? "transparent" : border}`,
        borderRadius: "12px",
        fontSize: "15px", fontWeight: 500, color: (!isEditing || readOnly) ? inkSec : ink,
        fontFamily: inter, outline: "none",
        transition: "all 0.2s"
      }}
    />
  </div>
);

export default function VendorPersonalInfo() {
  const navigate = useNavigate();
  const { vendor, updateVendorProfile } = useVendor();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Local form state initialized with context
  const [formData, setFormData] = useState({
    name: vendor.name,
    primaryContact: vendor.primaryContact,
    email: vendor.email,
    phone: vendor.phone,
    address: "Level 4, Business Center, Downtown",
    city: "Dubai",
    country: "UAE",
    gst: "TRN-938210332",
    category: "Facilities Management",
    regions: vendor.serviceRegions.join(", "),
    businessHours: "08:00 AM - 06:00 PM",
    emergencyContact: "+971 50 999 8888",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone) return;

    setIsSaving(true);
    setTimeout(() => {
      updateVendorProfile({
        name: formData.name,
        primaryContact: formData.primaryContact,
        email: formData.email,
        phone: formData.phone,
        serviceRegions: formData.regions.split(",").map(s => s.trim()),
      });
      setIsSaving(false);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 800);
  };



  return (
    <MobileLayout backgroundColor={bg} showBottomNav={false}>
      <BackHeader title="Personal Information" fallbackRoute="/vendor/settings" />

      <div style={{ padding: "20px 16px 40px" }}>
        {/* Profile Photo / Company Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          <div style={{ 
            width: "80px", height: "80px", borderRadius: "20px", 
            backgroundColor: "#2563EB", color: "white", 
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", fontWeight: 700, fontFamily: inter,
            boxShadow: "0 8px 24px rgba(37,99,235,0.25)",
            marginBottom: "12px"
          }}>
            {formData.name.charAt(0)}
          </div>
          {isEditing && (
            <button type="button" style={{ fontSize: "13px", fontWeight: 600, color: blue, background: "none", border: "none", cursor: "pointer", fontFamily: inter }}>
              Change Logo
            </button>
          )}
        </div>

        {/* Success message */}
        {success && (
          <div style={{ padding: "12px 16px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", color: green, fontSize: "13px", fontWeight: 600, fontFamily: inter, marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            Profile updated successfully.
          </div>
        )}

        {/* Form Container */}
        <div style={{ backgroundColor: card, borderRadius: "20px", padding: "20px", boxShadow: cardShadow, border: `1px solid ${border}` }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, margin: 0, fontFamily: inter }}>
              Company Details
            </h3>
            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} style={{ fontSize: "14px", fontWeight: 600, color: blue, background: "none", border: "none", cursor: "pointer", fontFamily: inter, padding: "4px 8px" }}>
                Edit
              </button>
            ) : null}
          </div>

          <InputField label="Company Name" name="name" value={formData.name} isEditing={isEditing} onChange={handleChange} />
          <InputField label="Vendor ID" name="vendorId" value={vendor.id} readOnly isEditing={isEditing} onChange={handleChange} />
          <InputField label="Primary Contact" name="primaryContact" value={formData.primaryContact} isEditing={isEditing} onChange={handleChange} />
          <InputField label="Email Address" name="email" value={formData.email} type="email" isEditing={isEditing} onChange={handleChange} />
          <InputField label="Phone Number" name="phone" value={formData.phone} type="tel" isEditing={isEditing} onChange={handleChange} />
          
          <div style={{ height: "1px", backgroundColor: border, margin: "24px 0" }} />

          <h3 style={{ fontSize: "16px", fontWeight: 700, color: ink, margin: "0 0 24px", fontFamily: inter }}>
            Business Information
          </h3>

          <InputField label="Office Address" name="address" value={formData.address} isEditing={isEditing} onChange={handleChange} />
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}><InputField label="City" name="city" value={formData.city} isEditing={isEditing} onChange={handleChange} /></div>
            <div style={{ flex: 1 }}><InputField label="Country" name="country" value={formData.country} isEditing={isEditing} onChange={handleChange} /></div>
          </div>

          <InputField label="GST / Tax Registration" name="gst" value={formData.gst} readOnly isEditing={isEditing} onChange={handleChange} />
          <InputField label="Vendor Category" name="category" value={formData.category} isEditing={isEditing} onChange={handleChange} />
          <InputField label="Service Regions" name="regions" value={formData.regions} isEditing={isEditing} onChange={handleChange} />
          <InputField label="Business Hours" name="businessHours" value={formData.businessHours} isEditing={isEditing} onChange={handleChange} />
          <InputField label="Emergency Contact" name="emergencyContact" value={formData.emergencyContact} isEditing={isEditing} onChange={handleChange} />

          {/* Action Buttons */}
          {isEditing && (
            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                style={{ flex: 1, padding: "16px", backgroundColor: "#F1F5F9", color: inkSec, border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                disabled={isSaving}
                style={{ flex: 2, padding: "16px", backgroundColor: blue, color: card, border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 600, fontFamily: inter, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
