import React from "react";
import DocumentScreen from "./DocumentScreen";

export default function PrivacyPolicyScreen() {
  const content = [
    "This Privacy Policy outlines how 10xDS Enterprise handles your data.",
    "Information Collection: We collect information when you register, log in, and use our application. This includes your name, email address, and usage metrics.",
    "Data Usage: The information we collect is used to personalize your experience, improve our platform, and provide customer service.",
    "Data Protection: We implement a variety of security measures to maintain the safety of your personal information.",
    "By using our application, you consent to our privacy policy."
  ];

  return <DocumentScreen title="Privacy Policy" content={content} />;
}
