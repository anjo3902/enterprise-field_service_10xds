import React from "react";
import DocumentScreen from "./DocumentScreen";

export default function TermsScreen() {
  const content = [
    "These Terms of Service govern your use of the 10xDS Enterprise application.",
    "Acceptance of Terms: By accessing and using our service, you accept and agree to be bound by the terms and provisions of this agreement.",
    "User Conduct: You agree to use the service only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the service.",
    "Intellectual Property: All content included on this site, such as text, graphics, logos, and software, is the property of 10xDS Enterprise.",
    "Modifications: We reserve the right to modify these terms at any time. Your continued use of the service signifies your acceptance of the updated terms."
  ];

  return <DocumentScreen title="Terms of Service" content={content} />;
}
