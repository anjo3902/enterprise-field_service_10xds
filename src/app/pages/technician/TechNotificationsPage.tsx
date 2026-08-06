import React from "react";
import { MobileLayout } from "../../components/ui/MobileLayout";
import { TechBottomNavigation } from "../../components/technician/TechBottomNavigation";
import { TechNotifications } from "../../components/technician/TechNotifications";

export default function TechNotificationsPage() {
  return (
    <MobileLayout 
      backgroundColor="#F8FAFC" 
      bottomNav={<TechBottomNavigation />}
      scrollContainerStyle={{ padding: 0, paddingBottom: "70px", overflow: "hidden" }}
    >
      <TechNotifications />
    </MobileLayout>
  );
}
