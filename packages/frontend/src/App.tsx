import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TicketBoardPage } from '@/pages/TicketBoardPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { AssetDetailPage } from '@/pages/AssetDetailPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { WorkflowDetailPage } from '@/pages/WorkflowDetailPage';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { CompliancePage } from '@/pages/CompliancePage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { SettingsLayout } from '@/pages/settings/SettingsLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MonitoringPage } from '@/pages/MonitoringPage';
import KnownErrorsPage from '@/pages/KnownErrorsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage';
import { PortalLayout } from '@/pages/portal/PortalLayout';
import { PortalTicketsPage } from '@/pages/portal/PortalTicketsPage';
import { PortalTicketDetailPage } from '@/pages/portal/PortalTicketDetailPage';
import { PortalKbPage } from '@/pages/portal/PortalKbPage';

// Lazy-loaded settings sub-pages
const GeneralSettingsPage = lazy(() => import('@/pages/settings/GeneralSettingsPage'));
const AccountSettingsPage = lazy(() => import('@/pages/settings/AccountSettingsPage'));
const TenantSettingsPage = lazy(() => import('@/pages/settings/TenantSettingsPage'));
const UsersSettingsPage = lazy(() => import('@/pages/settings/UsersSettingsPage'));
const CustomersSettingsPage = lazy(() => import('@/pages/settings/CustomersSettingsPage'));
const SlaSettingsPage = lazy(() => import('@/pages/settings/SlaSettingsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/settings/NotificationSettingsPage'));
const EscalationSettingsPage = lazy(() => import('@/pages/settings/EscalationSettingsPage'));
const AuditLogPage = lazy(() => import('@/pages/settings/AuditLogPage'));
const SlaReportsPage = lazy(() => import('@/pages/SlaReportsPage'));
const CabBoardPage = lazy(() => import('@/pages/CabBoardPage'));
const CreateTicketPage = lazy(() => import('@/pages/CreateTicketPage'));
const CreateAssetPage = lazy(() => import('@/pages/CreateAssetPage'));
const SystemSettingsPage = lazy(() => import('@/pages/settings/SystemSettingsPage'));
const AssetTypesSettingsPage = lazy(() => import('@/pages/settings/AssetTypesSettingsPage'));
const RelationTypesSettingsPage = lazy(() => import('@/pages/settings/RelationTypesSettingsPage'));
const ClassificationSettingsPage = lazy(() => import('@/pages/settings/ClassificationSettingsPage'));
const CapacityTypesSettingsPage = lazy(() => import('@/pages/settings/CapacityTypesSettingsPage'));
const ServiceProfilesSettingsPage = lazy(() => import('@/pages/settings/ServiceProfilesSettingsPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const CapacityPlanningPage = lazy(() => import('@/pages/CapacityPlanningPage'));

function SettingsFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketBoardPage />} />
            <Route path="/tickets/new" element={<Suspense fallback={<SettingsFallback />}><CreateTicketPage /></Suspense>} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/new" element={<Suspense fallback={<SettingsFallback />}><CreateAssetPage /></Suspense>} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/services" element={<ServiceCatalogPage />} />
            <Route path="/projects" element={<Suspense fallback={<SettingsFallback />}><ProjectsPage /></Suspense>} />
            <Route path="/projects/:id" element={<Suspense fallback={<SettingsFallback />}><ProjectDetailPage /></Suspense>} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/known-errors" element={<KnownErrorsPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/reports/sla" element={<Suspense fallback={<SettingsFallback />}><SlaReportsPage /></Suspense>} />
            <Route path="/capacity-planning" element={<Suspense fallback={<SettingsFallback />}><CapacityPlanningPage /></Suspense>} />
            <Route path="/cab" element={<Suspense fallback={<SettingsFallback />}><CabBoardPage /></Suspense>} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/general" replace />} />
              <Route path="general" element={<Suspense fallback={<SettingsFallback />}><GeneralSettingsPage /></Suspense>} />
              <Route path="account" element={<Suspense fallback={<SettingsFallback />}><AccountSettingsPage /></Suspense>} />
              <Route path="tenant" element={<Suspense fallback={<SettingsFallback />}><TenantSettingsPage /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<SettingsFallback />}><UsersSettingsPage /></Suspense>} />
              <Route path="customers" element={<Suspense fallback={<SettingsFallback />}><CustomersSettingsPage /></Suspense>} />
              <Route path="sla" element={<Suspense fallback={<SettingsFallback />}><SlaSettingsPage /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<SettingsFallback />}><NotificationSettingsPage /></Suspense>} />
              <Route path="escalation" element={<Suspense fallback={<SettingsFallback />}><EscalationSettingsPage /></Suspense>} />
              <Route path="audit" element={<Suspense fallback={<SettingsFallback />}><AuditLogPage /></Suspense>} />
              <Route path="asset-types" element={<Suspense fallback={<SettingsFallback />}><AssetTypesSettingsPage /></Suspense>} />
              <Route path="relation-types" element={<Suspense fallback={<SettingsFallback />}><RelationTypesSettingsPage /></Suspense>} />
              <Route path="classifications" element={<Suspense fallback={<SettingsFallback />}><ClassificationSettingsPage /></Suspense>} />
              <Route path="capacity-types" element={<Suspense fallback={<SettingsFallback />}><CapacityTypesSettingsPage /></Suspense>} />
              <Route path="service-profiles" element={<Suspense fallback={<SettingsFallback />}><ServiceProfilesSettingsPage /></Suspense>} />
              <Route path="system" element={<Suspense fallback={<SettingsFallback />}><SystemSettingsPage /></Suspense>} />
            </Route>
          </Route>

          {/* Customer Portal (own layout, own auth) */}
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="/portal" element={<PortalLayout />}>
            <Route path="tickets" element={<PortalTicketsPage />} />
            <Route path="tickets/:id" element={<PortalTicketDetailPage />} />
            <Route path="kb" element={<PortalKbPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </ThemeProvider>
  );
}
