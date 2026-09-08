import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ErrorLayout from './layouts/ErrorLayout';
import LoginForm from './components/layout/LoginForm.tsx';
import Dashboard from './pages/dashboard/Dashboard.tsx';
import ClassDefinitions from './pages/resources/ClassDefinitions.tsx';
import ClassEditor from './pages/resources/ClassEditor.tsx';
import ClassJsonEdit from './pages/resources/ClassJsonEdit.tsx';
import ClassCategories from './pages/resources/ClassCategories.tsx';
import EnvironmentDefinitions from './pages/environments/EnvironmentDefinitions';
import EnvironmentImport from './pages/environments/EnvironmentImport.tsx';
import EnvironmentEditor from './pages/environments/EnvironmentEditor.tsx';
import EnvironmentDeployments from './pages/environments/EnvironmentDeployments.tsx';
import VersionMatrix from './pages/environments/VersionMatrix.tsx';
import GlobalVersionMatrix from './pages/deployments/GlobalVersionMatrix.tsx';
import RunningTasks from './pages/deployments/RunningTasks.tsx';
import Cache from './pages/admin/Cache.tsx';
import ConfigurationSchemas from './pages/configurations/ConfigurationSchemas.tsx';
import ConfigurationSchemaEdit from './pages/configurations/ConfigurationSchemaEdit.tsx';
import ConfigurationSchemaImport from './pages/configurations/ConfigurationSchemaImport.tsx';
import Configurations from './pages/configurations/Configurations.tsx';
import ConfigurationEdit from './pages/configurations/ConfigurationEdit.tsx';
import ConfigurationImport from './pages/configurations/ConfigurationImport.tsx';
import ConfigurationProviderView from './pages/configurations/ConfigurationProviderView.tsx';
import ConfigurationTreeVisualization from './pages/configurations/ConfigurationTreeVisualization.tsx';

import Localizations from './pages/admin/localization/Localizations.tsx';
import LocalizationEdit from './pages/admin/localization/LocalizationEdit.tsx';
import LocalizationJsonEdit from './pages/admin/localization/LocalizationJsonEdit.tsx';
import ApiDocs from './pages/admin/ApiDocs.tsx';
import AuditLog from './pages/admin/AuditLog.tsx';
import Metrics from './pages/admin/metrics/Metrics.tsx';
import ApiTokens from './pages/admin/ApiTokens.tsx';
import UserManagement from './pages/admin/users/UserManagement.tsx';
import RoleManagement from './pages/admin/roles/RoleManagement.tsx';
import ConfigurationPage from './pages/admin/configuration/ConfigurationPage';
import UserProfile from './pages/profile/UserProfile.tsx';
import SettingsPage from './pages/settings/SettingsPage.tsx';
import BackupView from './pages/admin/backup/BackupView.tsx';
import SectionCatalogList from './pages/configurations/SectionCatalogList';
import Error404 from './pages/error/Error404';
import Error403 from './pages/error/Error403';
import Error401 from './pages/error/Error401';
import ComingSoon from './pages/error/ComingSoon';

import { AuthProvider, useAuth } from './context/AuthContext';
import About from './pages/documentation/About.tsx';
import CoreConcepts from './pages/documentation/CoreConcepts.tsx';
import QuickStart from './pages/documentation/QuickStart.tsx';
import AssistantHelp from './pages/documentation/AssistantHelp.tsx';
import ResourcesHelp from './pages/documentation/ResourcesHelp.tsx';
import RoleManagementHelp from './pages/documentation/RoleManagementHelp.tsx';
import EnvironmentsHelp from './pages/documentation/Environments.tsx';
import ConfigProviderViewHelpPage from './pages/documentation/ConfigProviderViewHelp.tsx';
import SectionCatalogHelpPage from './pages/documentation/SectionCatalogHelp.tsx';
import EnvironmentEditorDoc from './pages/documentation/EnvironmentEditorDoc.tsx';
import ConfigurationsTocHelp from './pages/documentation/ConfigurationsTocHelp.tsx';
import ApiTokensHelp from './pages/documentation/ApiTokens.tsx';
import UserManagementHelp from './pages/documentation/UserManagementHelp.tsx';
import AuditLogHelp from './pages/documentation/AuditLogHelp.tsx';
import LocalizationHelp from './pages/documentation/LocalizationHelp.tsx';
import GlobalVersionMatrixHelp from './pages/documentation/GlobalVersionMatrixHelp.tsx';
import CacheHelp from './pages/documentation/CacheHelp.tsx';
import BackupRestoreHelp from './pages/documentation/BackupRestoreHelp.tsx';
import FullscreenLayout from './layouts/FullscreenLayout.tsx';
import './App.css';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='loader-container'>
        <div className='loader'></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();

  if (isLoading) {
    return (
      <div className='loader-container'>
        <div className='loader'></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return hasAnyRole(['ADMIN']) ? <Outlet /> : <Navigate to="/403" replace />;
};

const ProtectedRouteByPermission = ({ permission }: { permission: string }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className='loader-container'>
        <div className='loader'></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return hasPermission(permission) ? <Outlet /> : <Navigate to="/403" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          /* Public Routes */
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginForm />} />
          </Route>

          /* Protected Routes */
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Environments */}
              <Route element={<ProtectedRouteByPermission permission="PERM_ENVIRONMENT_READ" />}>
                <Route path="/environments/definitions" element={<EnvironmentDefinitions />} />
                <Route path="/environments/import" element={<EnvironmentImport />} />
                <Route path="/environments/definitions/new" element={<EnvironmentEditor />} />
                <Route path="/environments/definitions/:id" element={<EnvironmentEditor />} />
                <Route path="/environments/deployed" element={<EnvironmentDeployments />} />
                <Route path="/environments/version-matrix/:envId" element={<VersionMatrix />} />
                <Route path="/environments/running" element={<RunningTasks />} />
              </Route>

              {/* Deployments */}
              <Route element={<ProtectedRouteByPermission permission="PERM_VERSIONS_READ" />}>
                <Route path="/deployments/version-matrix" element={<GlobalVersionMatrix />} />
              </Route>
              <Route path="/deployments" element={<div>deployments Page</div>} />

              {/* Configurations */}
              <Route path="/configurations" element={<Navigate to="/configurations/maps" replace />} />
              <Route element={<ProtectedRouteByPermission permission="PERM_CONFIG_PROVIDER_READ" />}>
                <Route path="/configurations/maps" element={<Configurations />} />
                <Route path="/configurations/maps/new" element={<ConfigurationEdit />} />
                <Route path="/configurations/maps/import" element={<ConfigurationImport />} />
                <Route path="/configurations/maps/:id" element={<ConfigurationEdit />} />
                <Route path="/configurations/maps/:id/provider-view" element={<ConfigurationProviderView />} />
                <Route path="/configurations/maps/:id/tree-view" element={<ConfigurationTreeVisualization />} />
              </Route>
              <Route element={<ProtectedRouteByPermission permission="PERM_CONFIG_SCHEMA_READ" />}>
                <Route path="/configurations/schemas" element={<ConfigurationSchemas />} />
                <Route path="/configurations/schemas/new" element={<ConfigurationSchemaEdit />} />
                <Route path="/configurations/schemas/import" element={<ConfigurationSchemaImport />} />
                <Route path="/configurations/schemas/:id" element={<ConfigurationSchemaEdit />} />
              </Route>
              <Route element={<ProtectedRouteByPermission permission="PERM_CONFIG_SECTIONS_READ" />}>
                <Route path="/configurations/section-catalog" element={<SectionCatalogList />} />
              </Route>

              {/* Resources */}
              <Route element={<ProtectedRouteByPermission permission="PERM_RESOURCE_READ" />}>
                <Route path="/resources/definitions" element={<ClassDefinitions />} />
                <Route path="/resources/definitions/new" element={<ClassEditor />} />
                <Route path="/resources/definitions/:id" element={<ClassEditor />} />
                <Route path="/resources/definitions/:id/json" element={<ClassJsonEdit />} />
                <Route path="/resources/categories" element={<ClassCategories />} />
              </Route>

              {/* Documentation — unchanged, fully open */}
              <Route path="/documentation" element={<div>Documentation</div>} />
              <Route path="/documentation/core-concepts" element={<CoreConcepts />} />
              <Route path="/documentation/quick-start" element={<QuickStart />} />
              <Route path="/documentation/assistant" element={<AssistantHelp />} />
              <Route path="/documentation/resources" element={<ResourcesHelp />} />
              <Route path="/documentation/roles" element={<RoleManagementHelp />} />
              <Route path="/documentation/environments" element={<EnvironmentsHelp />} />
              <Route path="/documentation/config-provider-viewer" element={<ConfigProviderViewHelpPage />} />
              <Route path="/documentation/environment-editor" element={<EnvironmentEditorDoc />} />
              <Route path="/documentation/configurations" element={<ConfigurationsTocHelp />} />
              <Route path="/documentation/section-catalog" element={<SectionCatalogHelpPage />} />
              <Route path="/documentation/version-matrix" element={<GlobalVersionMatrixHelp />} />
              <Route path="/documentation/api-tokens" element={<ApiTokensHelp />} />
              <Route path="/documentation/users" element={<UserManagementHelp />} />
              <Route path="/documentation/audit-log" element={<AuditLogHelp />} />
              <Route path="/documentation/localization" element={<LocalizationHelp />} />
              <Route path="/documentation/cache" element={<CacheHelp />} />
              <Route path="/documentation/backup-restore" element={<BackupRestoreHelp />} />
              <Route path="/documentation/about" element={<About />} />

              {/* Admin */}
              <Route element={<AdminRoute />}>
                <Route element={<ProtectedRouteByPermission permission="PERM_USER_READ" />}>
                  <Route path="/admin/users" element={<UserManagement />} />
                </Route>
                <Route element={<ProtectedRouteByPermission permission="PERM_USER_READ" />}>
                  <Route path="/admin/configuration" element={<ConfigurationPage />} />
                </Route>
                <Route element={<ProtectedRouteByPermission permission="PERM_ROLE_READ" />}>
                  <Route path="/admin/roles" element={<RoleManagement />} />
                </Route>
                <Route element={<ProtectedRouteByPermission permission="PERM_AUDIT_READ" />}>
                  <Route path="/admin/audit-log" element={<AuditLog />} />
                </Route>
                <Route element={<ProtectedRouteByPermission permission="PERM_BACKUP_READ" />}>
                  <Route path="/admin/backup" element={<BackupView />} />
                </Route>
                <Route path="/admin/api-tokens" element={<ApiTokens />} />
                <Route path="/admin/api-docs" element={<ApiDocs />} />
                <Route path="/admin/cache" element={<Cache />} />
                <Route path="/admin/metrics" element={<Metrics />} />
                <Route path="/admin/security" element={<div>Security Settings</div>} />
                <Route path="/admin/localization" element={<Localizations />} />
                <Route path="/admin/localization/new" element={<LocalizationEdit />} />
                <Route path="/admin/localization/:id" element={<LocalizationEdit />} />
                <Route path="/admin/localization/:id/json" element={<LocalizationJsonEdit />} />
              </Route>
            </Route>
          </Route>

          /* Error Routes */
          <Route element={<ErrorLayout />}>
            <Route path="/403" element={<Error403 />} />
            <Route path="/401" element={<Error401 />} />
            <Route path="/404" element={<Error404 />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
          </Route>

          <Route element={<FullscreenLayout />}>
            <Route path="/about" element={<About />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter >
    </AuthProvider>
  );
}

export default App;
