import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/layout';
import { LoginPage, RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { UsersPage } from './pages/users';
import { FormsPage, FormBuilderPage } from './pages/forms';
import { DatasetsPage } from './pages/datasets';
import { WorkflowsPage } from './pages/workflows';
import { WorkflowDesigner } from './pages/workflows/WorkflowDesigner';
import { AppsPage, AppBuilder } from './pages/apps';
import { DecisionTablesPage, DecisionTableEditor } from './pages/decision-tables';
import { IntegrationsPage } from './pages/integrations';
import { ReportsPage } from './pages/reports';
import { SettingsPage } from './pages/settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Full-screen designers (outside AppShell) */}
          <Route path="/workflows/:id/design" element={<WorkflowDesigner />} />
          <Route path="/workflows/new/design" element={<WorkflowDesigner />} />
          <Route path="/apps/:id/build" element={<AppBuilder />} />
          <Route path="/decision-tables/:id/edit" element={<DecisionTableEditor />} />

          {/* Protected routes */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/forms" element={<FormsPage />} />
            <Route path="/forms/new" element={<FormBuilderPage />} />
            <Route path="/forms/:id/edit" element={<FormBuilderPage />} />
            <Route path="/datasets" element={<DatasetsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/decision-tables" element={<DecisionTablesPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
