import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import PricingPage from './pages/PricingPage';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Caisse from './pages/Caisse';
import BankPayments from './pages/BankPayments';
import TVA from './pages/TVA';
import Transports from './pages/Transports';
import ComptableSettings from './pages/ComptableSettings';
import SageJournal from './pages/sage/SageJournal';
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
          <Route index element={<FinanceDashboard />} />
          <Route path="inventory" element={<Dashboard />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="caisse" element={<Caisse />} />
          <Route path="bank" element={<BankPayments />} />
          <Route path="tva" element={<TVA />} />
          <Route path="transports" element={<Transports />} />
          <Route path="comptable-settings" element={<ComptableSettings />} />
          <Route path="sage/achat" element={<SageJournal kind="ach" />} />
          <Route path="sage/achat-divers" element={<SageJournal kind="achdiv" />} />
          <Route path="sage/immobilisations" element={<SageJournal kind="immo" />} />
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
