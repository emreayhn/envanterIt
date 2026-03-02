/**
 * App.jsx — Root component with MSAL auth + React Router.
 * DEV_MODE: When VITE_DEV_MODE=true, MSAL auth is bypassed entirely.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';

import DashboardLayout from './components/templates/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InventoryHub from './pages/InventoryHub';
import Computers from './pages/Computers';
import Kiosks from './pages/Kiosks';
import Printers from './pages/Printers';
import DynamicInventory from './pages/DynamicInventory';
import Licenses from './pages/Licenses';
import Employees from './pages/Employees';
import Assignments from './pages/Assignments';
import ProcessManagement from './pages/ProcessManagement';

const IS_DEV = import.meta.env.VITE_DEV_MODE !== 'false'; // default true

// ── Dev Mode App (no MSAL) ─────────────────────────────
function DevApp() {
  const devUser = {
    name: 'IT Admin (Dev)',
    email: 'admin@dev.local',
    photoUrl: null,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout user={devUser} onLogout={() => window.location.reload()} />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<InventoryHub />} />
          <Route path="inventory/computers" element={<Computers />} />
          <Route path="inventory/kiosks" element={<Kiosks />} />
          <Route path="inventory/printers" element={<Printers />} />
          <Route path="inventory/dynamic/:slug" element={<DynamicInventory />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="employees" element={<Employees />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="processes" element={<ProcessManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// ── Production App (with MSAL) ──────────────────────────
function ProdApp() {
  // Lazy-import MSAL only in production
  const [MsalComponents, setMsalComponents] = useState(null);

  useEffect(() => {
    Promise.all([
      import('@azure/msal-react'),
      import('./config/MsalProviderWrapper.jsx'),
      import('./config/authConfig.js'),
    ]).then(([msalReact, msalWrapper, authCfg]) => {
      setMsalComponents({
        AuthenticatedTemplate: msalReact.AuthenticatedTemplate,
        UnauthenticatedTemplate: msalReact.UnauthenticatedTemplate,
        useMsal: msalReact.useMsal,
        useAccount: msalReact.useAccount,
        MsalProviderWrapper: msalWrapper.default,
        loginRequest: authCfg.loginRequest,
        graphConfig: authCfg.graphConfig,
      });
    });
  }, []);

  if (!MsalComponents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Yükleniyor...</p>
      </div>
    );
  }

  const {
    AuthenticatedTemplate,
    UnauthenticatedTemplate,
    useMsal,
    useAccount,
    MsalProviderWrapper,
    loginRequest,
    graphConfig,
  } = MsalComponents;

  function AuthenticatedApp() {
    const { instance, accounts } = useMsal();
    const account = useAccount(accounts[0] || {});
    const [user, setUser] = useState({ name: '', email: '', photoUrl: null });

    useEffect(() => {
      if (!account) return;
      setUser((u) => ({
        ...u,
        name: account.name || account.username,
        email: account.username,
      }));

      instance
        .acquireTokenSilent({ ...loginRequest, account })
        .then((res) => {
          sessionStorage.setItem('msal_access_token', res.accessToken);
          return fetch(graphConfig.graphPhotoEndpoint, {
            headers: { Authorization: `Bearer ${res.accessToken}` },
          });
        })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) setUser((u) => ({ ...u, photoUrl: URL.createObjectURL(blob) }));
        })
        .catch(() => { });
    }, [account, instance]);

    const handleLogout = () => instance.logoutRedirect();

    return (
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<InventoryHub />} />
            <Route path="inventory/computers" element={<Computers />} />
            <Route path="inventory/kiosks" element={<Kiosks />} />
            <Route path="inventory/printers" element={<Printers />} />
            <Route path="inventory/dynamic/:slug" element={<DynamicInventory />} />
            <Route path="licenses" element={<Licenses />} />
            <Route path="employees" element={<Employees />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="processes" element={<ProcessManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <MsalProviderWrapper>
      <UnauthenticatedTemplate>
        <Login />
      </UnauthenticatedTemplate>
      <AuthenticatedTemplate>
        <AuthenticatedApp />
      </AuthenticatedTemplate>
    </MsalProviderWrapper>
  );
}

export default function App() {
  return IS_DEV ? <DevApp /> : <ProdApp />;
}
