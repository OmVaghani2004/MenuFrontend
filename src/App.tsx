import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { MenuManagement } from './pages/MenuManagement';
import { TableManagement } from './pages/TableManagement';
import { OrderManagement } from './pages/OrderManagement';
import { WaiterManagement } from './pages/WaiterManagement';
import { Settings } from './pages/Settings';
import { CustomerMenu } from './pages/CustomerMenu';

// Route Guard to check for authentications
interface GuardProps {
  children: React.ReactElement;
  requireOwner?: boolean;
}

const AuthGuard: React.FC<GuardProps> = ({ children, requireOwner = false }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'Staff';

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireOwner && role !== 'Owner') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Route Guard to prevent logged-in users from seeing Auth screens
const GuestGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Public customer-facing menu — no auth required (accessed via QR code) */}
        <Route path="/menu-view" element={<CustomerMenu />} />

        {/* Guest Routes */}
        <Route 
          path="/login" 
          element={
            <GuestGuard>
              <Login />
            </GuestGuard>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <GuestGuard>
              <Signup />
            </GuestGuard>
          } 
        />

        {/* Authenticated Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <Layout>
                <Dashboard />
              </Layout>
            </AuthGuard>
          } 
        />
        
        <Route 
          path="/orders" 
          element={
            <AuthGuard>
              <Layout>
                <OrderManagement />
              </Layout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/menu" 
          element={
            <AuthGuard>
              <Layout>
                <MenuManagement />
              </Layout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/tables" 
          element={
            <AuthGuard>
              <Layout>
                <TableManagement />
              </Layout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/waiters" 
          element={
            <AuthGuard requireOwner={true}>
              <Layout>
                <WaiterManagement />
              </Layout>
            </AuthGuard>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <AuthGuard>
              <Layout>
                <Settings />
              </Layout>
            </AuthGuard>
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
