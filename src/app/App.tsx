import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import { AuthLayout } from "./layouts/AuthLayout";
import { AppLayout } from "./layouts/AppLayout";
import { VendorLayout } from "./layouts/VendorLayout";
import { TechnicianLayout } from "./layouts/TechnicianLayout";
import { AdminLayout } from "./layouts/AdminLayout";

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleRoute } from "./components/auth/RoleRoute";
// Auth pages
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import RegistrationSuccessPage from "./pages/RegistrationSuccessPage";

// App pages
import DashboardPage from "./pages/DashboardPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import AssetsPage from "./pages/AssetsPage";
import MachineHealthPage from "./pages/MachineHealthPage";
import RevenueIntelligencePage from "./pages/RevenueIntelligencePage";
import SLATrackerPage from "./pages/SLATrackerPage";
import SLADetailsPage from "./pages/SLADetailsPage";
import { TechnicianPerformancePage } from "./pages/TechnicianPerformancePage";
import { TechnicianDetailsPage } from "./pages/TechnicianDetailsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AIReportPage from "./pages/AIReportPage";
import ReportsPage from "./pages/ReportsPage";
import AssetDetailsPage from "./pages/AssetDetailsPage";
import AssetFiltersPage from "./pages/AssetFiltersPage";
import AssetHistoryPage from "./pages/AssetHistoryPage";
import AssetListingPage from "./pages/AssetListingPage";
import AssetSearchPage from "./pages/AssetSearchPage";
import AssetRenewalsPage from "./pages/AssetRenewalsPage";
import AssetRenewalDetailsPage from "./pages/AssetRenewalDetailsPage";
import HealthScorePage from "./pages/HealthScorePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import FAQPage from "./pages/FAQPage";
import UserGuidePage from "./pages/UserGuidePage";
import TutorialsPage from "./pages/TutorialsPage";
import LiveChatPage from "./pages/LiveChatPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import RaiseTicketPage from "./pages/RaiseTicketPage";
import TicketTimelinePage from "./pages/TicketTimelinePage";
import OrgTicketDetailsPage from "./pages/OrgTicketDetailsPage";
import SecurityPage from "./pages/SecurityPage";
import { SecurityAccessLogsPage } from "./pages/SecurityAccessLogsPage";
import { TasksPage } from "./pages/TasksPage";

// 404
import NotFoundPage from "./pages/NotFoundPage";

import { AssetProvider } from "./contexts/AssetContext";
import { MachineHealthProvider } from "./contexts/MachineHealthContext";
import { RevenueProvider } from "./contexts/RevenueContext";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";
import { ReportsProvider } from "./contexts/ReportsContext";
import { VendorProvider } from "./contexts/VendorContext";
import MachineHealthListPage from "./pages/MachineHealthListPage";
import MachineDetailsPage from "./pages/MachineDetailsPage";
import RevenueOpportunitiesPage from "./pages/RevenueOpportunitiesPage";
import ReportLibraryPage from "./pages/ReportLibraryPage";

// Vendor Pages
import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorTicketBoardPage from "./pages/vendor/VendorTicketBoardPage";
import VendorTicketDetailPage from "./pages/vendor/VendorTicketDetailPage.tsx";
import VendorTechnicianListPage from "./pages/vendor/VendorTechnicianListPage";
import VendorTechnicianDetailPage from "./pages/vendor/VendorTechnicianDetailPage";
import VendorSLAPage from "./pages/vendor/VendorSLAPage";
import VendorAssetListPage from "./pages/vendor/VendorAssetListPage";
import VendorAssetDetailPage from "./pages/vendor/VendorAssetDetailPage";
import VendorMaintenancePage from "./pages/vendor/VendorMaintenancePage";
import VendorMaintenanceDetailPage from "./pages/vendor/VendorMaintenanceDetailPage";
import VendorGlobalSearchPage from "./pages/vendor/VendorGlobalSearchPage.tsx";
import VendorAMCPage from "./pages/vendor/VendorAMCPage";
import VendorWarrantyPage from "./pages/vendor/VendorWarrantyPage";
import VendorWarrantyDetailPage from "./pages/vendor/VendorWarrantyDetailPage.tsx";
import VendorSettingsPage from "./pages/vendor/VendorSettingsPage";
import VendorPerformancePage from "./pages/vendor/VendorPerformancePage";
import VendorNotificationsPage from "./pages/vendor/VendorNotificationsPage";
import VendorAIAssistantPage from "./pages/vendor/VendorAIAssistantPage";
import VendorReviewQueuePage from "./pages/vendor/VendorReviewQueuePage";
import VendorWorkOrderPage from "./pages/vendor/VendorWorkOrderPage";
import VendorRevenuePage from "./pages/vendor/VendorRevenuePage";
import VendorActivityPage from "./pages/vendor/VendorActivityPage";
import VendorPersonalInfoPage from "./pages/vendor/VendorPersonalInfoPage";
import VendorChangePasswordPage from "./pages/vendor/VendorChangePasswordPage";
import VendorHelpSupportPage from "./pages/vendor/VendorHelpSupportPage";
import VendorLiveChatPage from "./pages/vendor/VendorLiveChatPage";
import VendorCreateTicketPage from "./pages/vendor/VendorCreateTicketPage";

// Technician Pages
import TechHomePage from "./pages/technician/TechHomePage";
import TechJobListPage from "./pages/technician/TechJobListPage";
import TechJobDetailPage from "./pages/technician/TechJobDetailPage";
import TechAIPage from "./pages/technician/TechAIPage";
import TechNotificationsPage from "./pages/technician/TechNotificationsPage";
import TechProfilePage from "./pages/technician/TechProfilePage";
import TechChangePasswordPage from "./pages/technician/TechChangePasswordPage";
import TechHelpSupportPage from "./pages/technician/TechHelpSupportPage";
import TechPerformancePage from "./pages/technician/TechPerformancePage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import OrganizationListPage from "./pages/admin/OrganizationListPage";
import OrganizationCreatePage from "./pages/admin/OrganizationCreatePage";
import OrganizationDetailPage from "./pages/admin/OrganizationDetailPage";
import OrganizationEditPage from "./pages/admin/OrganizationEditPage";
import OrganizationAnalyticsPage from "./pages/admin/OrganizationAnalyticsPage";
import VendorListPage from "./pages/admin/VendorListPage";
import VendorCreatePage from "./pages/admin/VendorCreatePage";
import VendorDetailPage from "./pages/admin/VendorDetailPage";
import VendorEditPage from "./pages/admin/VendorEditPage";
import UserListPage from "./pages/admin/UserListPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import UserCreatePage from "./pages/admin/UserCreatePage";
import PlatformAnalyticsPage from "./pages/admin/PlatformAnalyticsPage";
import VendorLeaderboardPage from "./pages/admin/VendorLeaderboardPage";
import TechnicianUtilizationPage from "./pages/admin/TechnicianUtilizationPage";
import TenantComparisonPage from "./pages/admin/TenantComparisonPage";
import SLAPolicyListPage from "./pages/admin/SLAPolicyListPage";
import SLAPolicyDetailPage from "./pages/admin/SLAPolicyDetailPage";
import SLAPolicyCreatePage from "./pages/admin/SLAPolicyCreatePage";
import SLAPolicyEditPage from "./pages/admin/SLAPolicyEditPage";
import AIOverviewPage from "./pages/admin/AIOverviewPage";
import AIModelDetailPage from "./pages/admin/AIModelDetailPage";
import AIInsightFeedPage from "./pages/admin/AIInsightFeedPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import AuditDetailPage from "./pages/admin/AuditDetailPage";
import SecurityDashboardPage from "./pages/admin/SecurityDashboardPage";
import AccessLogsPage from "./pages/admin/AccessLogsPage";
import SessionManagerPage from "./pages/admin/SessionManagerPage";
import FailedLoginsPage from "./pages/admin/FailedLoginsPage";
import PlatformSettingsPage from "./pages/admin/PlatformSettingsPage";
import IntegrationHubPage from "./pages/admin/IntegrationHubPage";
import NotificationEnginePage from "./pages/admin/NotificationEnginePage";
import LicenseManagerPage from "./pages/admin/LicenseManagerPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";

export default function App() {
  return (
    <AuthProvider>
    <VendorProvider>
    <AssetProvider>
      <MachineHealthProvider>
        <RevenueProvider>
          <AnalyticsProvider>
          <ReportsProvider>
          <BrowserRouter>
            <Routes>
        {/* Root → redirect to login */}
        <Route index element={<Navigate to="/login" replace />} />

        {/* ── Unauthenticated routes (Auth layout) ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
        </Route>

        {/* ── Authenticated routes (App layout) ── */}
        <Route element={<ProtectedRoute><RoleRoute allowedRoles={["org_admin", "org_user", "system_admin"]}><AppLayout /></RoleRoute></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/machine-health" element={<MachineHealthPage />} />
          <Route path="/machine-health/list" element={<MachineHealthListPage />} />
          <Route path="/machine-health/details/:id" element={<MachineDetailsPage />} />
          <Route path="/revenue-intelligence" element={<RevenueIntelligencePage />} />
          <Route path="/revenue-intelligence/opportunities" element={<RevenueOpportunitiesPage />} />
          <Route path="/sla-tracker" element={<SLATrackerPage />} />
          <Route path="/sla-tracker/:id" element={<SLATrackerPage />} />
          <Route path="/sla-details/:id" element={<SLADetailsPage />} />
          <Route path="/technician-performance" element={<TechnicianPerformancePage />} />
          <Route path="/technician-performance/:id" element={<TechnicianDetailsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/library" element={<ReportLibraryPage />} />
          <Route path="/reports/ai" element={<AIReportPage />} />
          <Route path="/assets/details/:assetId" element={<AssetDetailsPage />} />
          <Route path="/assets/filters" element={<AssetFiltersPage />} />
          <Route path="/assets/history" element={<AssetHistoryPage />} />
          <Route path="/assets/listing" element={<AssetListingPage />} />

          <Route path="/assets/search" element={<AssetSearchPage />} />
          <Route path="/assets/renewals" element={<AssetRenewalsPage />} />
          <Route path="/assets/renewals/:id" element={<AssetRenewalDetailsPage />} />
          <Route path="/machine-health/score" element={<HealthScorePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/password" element={<ChangePasswordPage />} />
          <Route path="/settings/faq" element={<FAQPage />} />
          <Route path="/settings/guide" element={<UserGuidePage />} />
          <Route path="/settings/tutorials" element={<TutorialsPage />} />
          <Route path="/settings/chat" element={<LiveChatPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/raise-ticket" element={<RaiseTicketPage />} />
          <Route path="/ticket-details/:id" element={<OrgTicketDetailsPage />} />
          <Route path="/ticket-timeline/:id" element={<TicketTimelinePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/security/logs" element={<SecurityAccessLogsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Route>

        {/* ── Vendor Manager routes ── */}
        <Route path="/vendor" element={<ProtectedRoute><RoleRoute allowedRoles={["vendor_admin"]}><VendorLayout /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboardPage />} />
          <Route path="review" element={<VendorReviewQueuePage />} />
          <Route path="activity" element={<VendorActivityPage />} />
          <Route path="work-orders/:id" element={<VendorWorkOrderPage />} />
          <Route path="tickets" element={<VendorTicketBoardPage />} />
          <Route path="tickets/:id" element={<VendorTicketDetailPage />} />
          <Route path="technicians" element={<VendorTechnicianListPage />} />
          <Route path="technicians/:id" element={<VendorTechnicianDetailPage />} />
          <Route path="sla" element={<VendorSLAPage />} />
          <Route path="assets" element={<VendorAssetListPage />} />
          <Route path="assets/:id" element={<VendorAssetDetailPage />} />
          <Route path="amc" element={<VendorAMCPage />} />
          <Route path="warranty" element={<VendorWarrantyPage />} />
          <Route path="warranty/:id" element={<VendorWarrantyDetailPage />} />
          <Route path="maintenance" element={<VendorMaintenancePage />} />
          <Route path="maintenance/:id" element={<VendorMaintenanceDetailPage />} />
          <Route path="performance" element={<VendorPerformancePage />} />
          <Route path="revenue" element={<VendorRevenuePage />} />
          <Route path="notifications" element={<VendorNotificationsPage />} />
          <Route path="assistant" element={<VendorAIAssistantPage />} />
          <Route path="search" element={<VendorGlobalSearchPage />} />
          <Route path="settings" element={<VendorSettingsPage />} />
          <Route path="settings/personal-info" element={<VendorPersonalInfoPage />} />
          <Route path="settings/password" element={<VendorChangePasswordPage />} />
          <Route path="settings/help" element={<VendorHelpSupportPage />} />
          <Route path="settings/chat" element={<VendorLiveChatPage />} />
          <Route path="settings/ticket" element={<VendorCreateTicketPage />} />
        </Route>

        {/* ── Technician Portal Routes ── */}
        <Route path="/tech" element={<ProtectedRoute><RoleRoute allowedRoles={["vendor_technician"]}><TechnicianLayout /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/tech/home" replace />} />
          <Route path="home" element={<TechHomePage />} />
          <Route path="jobs" element={<TechJobListPage />} />
          <Route path="jobs/:id" element={<TechJobDetailPage />} />
          <Route path="work-order/:id" element={<TechJobDetailPage />} />
          <Route path="report/:id" element={<TechJobDetailPage />} />
          <Route path="ai" element={<TechAIPage />} />
          <Route path="notifications" element={<TechNotificationsPage />} />
          <Route path="profile" element={<TechProfilePage />} />
          <Route path="profile/password" element={<TechChangePasswordPage />} />
          <Route path="profile/help" element={<TechHelpSupportPage />} />
          <Route path="performance" element={<TechPerformancePage />} />
        </Route>

        {/* ── System Admin Routes ── */}
        <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={["system_admin"]}><AdminLayout /></RoleRoute></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="organizations" element={<OrganizationListPage />} />
          <Route path="organizations/create" element={<OrganizationCreatePage />} />
          <Route path="organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="organizations/:id/edit" element={<OrganizationEditPage />} />
          <Route path="organizations/:id/analytics" element={<OrganizationAnalyticsPage />} />
          <Route path="vendors" element={<VendorListPage />} />
          <Route path="vendors/create" element={<VendorCreatePage />} />
          <Route path="vendors/:id" element={<VendorDetailPage />} />
          <Route path="vendors/:id/edit" element={<VendorEditPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="users/create" element={<UserCreatePage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
          <Route path="settings/integrations" element={<IntegrationHubPage />} />
          <Route path="settings/notifications" element={<NotificationEnginePage />} />
          <Route path="analytics" element={<PlatformAnalyticsPage />} />
          <Route path="analytics/vendors" element={<VendorLeaderboardPage />} />
          <Route path="analytics/technicians" element={<TechnicianUtilizationPage />} />
          <Route path="analytics/tenants" element={<TenantComparisonPage />} />
          <Route path="sla" element={<SLAPolicyListPage />} />
          <Route path="sla/create" element={<SLAPolicyCreatePage />} />
          <Route path="sla/:id" element={<SLAPolicyDetailPage />} />
          <Route path="sla/:id/edit" element={<SLAPolicyEditPage />} />
          <Route path="ai-config" element={<AIOverviewPage />} />
          <Route path="ai-config/insights" element={<AIInsightFeedPage />} />
          <Route path="ai-config/:id" element={<AIModelDetailPage />} />
          <Route path="security" element={<SecurityDashboardPage />} />
          <Route path="security/logs" element={<AccessLogsPage />} />
          <Route path="security/sessions" element={<SessionManagerPage />} />
          <Route path="security/failed-logins" element={<FailedLoginsPage />} />
          <Route path="license" element={<LicenseManagerPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="audit/:id" element={<AuditDetailPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>

        {/* ── 404 catch-all ── */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
          </BrowserRouter>
          </ReportsProvider>
          </AnalyticsProvider>
        </RevenueProvider>
      </MachineHealthProvider>
    </AssetProvider>
    </VendorProvider>
    </AuthProvider>
  );
}
