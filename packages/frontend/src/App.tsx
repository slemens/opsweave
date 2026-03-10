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
const SystemSettingsPage = lazy(() => import('@/pages/settings/SystemSettingsPage'));

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
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/services" element={<ServiceCatalogPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/known-errors" element={<KnownErrorsPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/general" replace />} />
              <Route path="general" element={<Suspense fallback={<SettingsFallback />}><GeneralSettingsPage /></Suspense>} />
              <Route path="account" element={<Suspense fallback={<SettingsFallback />}><AccountSettingsPage /></Suspense>} />
              <Route path="tenant" element={<Suspense fallback={<SettingsFallback />}><TenantSettingsPage /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<SettingsFallback />}><UsersSettingsPage /></Suspense>} />
              <Route path="customers" element={<Suspense fallback={<SettingsFallback />}><CustomersSettingsPage /></Suspense>} />
              <Route path="sla" element={<Suspense fallback={<SettingsFallback />}><SlaSettingsPage /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<SettingsFallback />}><NotificationSettingsPage /></Suspense>} />
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
