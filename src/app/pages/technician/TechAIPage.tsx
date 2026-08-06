import React from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { TechBottomNavigation } from "../../components/technician/TechBottomNavigation";
import { TechAIAssistant } from "../../components/technician/TechAIAssistant";

export default function TechAIPage() {
  return (
    <MobileLayout 
      backgroundColor="#F8FAFC" 
      bottomNav={<TechBottomNavigation />} 
      scrollContainerStyle={{ padding: 0, paddingBottom: "70px", overflow: "hidden" }}
    >
      <TechAIAssistant />
    </MobileLayout>
  );
}
