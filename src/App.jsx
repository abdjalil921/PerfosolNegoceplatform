import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import PricingPage from './pages/PricingPage';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Caisse from './pages/Caisse';
import BankPayments from './pages/BankPayments';
import TVA from './pages/TVA';
import Transports from './pages/Transports';
import { useAuthInit } from './hooks/useAuth';
import { useSettingsInit } from './hooks/useSettings';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Detects Supabase auth tokens in the URL hash (invite / password recovery)
 * and immediately redirects to /update-password so the user can set a password
 * before ProtectedRoute has a chance to redirect them to /login.
 */
function HashHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      // Navigate to /update-password keeping the hash so Supabase can
      // exchange the token for a session.
      navigate('/update-password' + hash, { replace: true });
    }
  }, [navigate]);

  return null;
}

function App() {
  useAuthInit();       // Initialize auth listener once at the top level
  useSettingsInit();   // Load logo + company name from DB once at the top level
  return (
    <Router>
      <HashHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Protected Application Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="caisse" element={<Caisse />} />
          <Route path="bank" element={<BankPayments />} />
          <Route path="tva" element={<TVA />} />
          <Route path="transports" element={<Transports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
