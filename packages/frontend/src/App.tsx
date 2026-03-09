import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
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
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage';
import { PortalLayout } from '@/pages/portal/PortalLayout';
import { PortalTicketsPage } from '@/pages/portal/PortalTicketsPage';
import { PortalTicketDetailPage } from '@/pages/portal/PortalTicketDetailPage';

export function App() {
  return (
    <ThemeProvider>
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
            <Route path="/services" element={<ServiceCatalogPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Customer Portal (own layout, own auth) */}
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="/portal" element={<PortalLayout />}>
            <Route path="tickets" element={<PortalTicketsPage />} />
            <Route path="tickets/:id" element={<PortalTicketDetailPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
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
