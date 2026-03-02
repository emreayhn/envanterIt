/**
 * App.jsx — Root component with JWT auth + React Router.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import DashboardLayout from './components/templates/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
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
import UserManagement from './pages/UserManagement';
import useWebSocket from './hooks/useWebSocket';

function ProtectedRoutes() {
  const stored = localStorage.getItem('auth_user');
  const user = stored ? JSON.parse(stored) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  };

  // Activate WebSocket for real-time updates
  useWebSocket();

  return (
    <Routes>
      <Route element={<DashboardLayout user={{ name: user.full_name, email: user.email, role: user.role }} onLogout={handleLogout} />}>
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
        {user.role === 'admin' && (
          <Route path="users" element={<UserManagement />} />
        )}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
