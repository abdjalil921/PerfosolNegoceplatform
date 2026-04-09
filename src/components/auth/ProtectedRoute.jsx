import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Pages comptable is allowed to visit
export const COMPTABLE_ALLOWED = ['/purchases', '/sales', '/bank', '/caisse', '/profile'];

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin-only routes (e.g. /admin)
    if (requireAdmin && profile?.role !== 'admin') {
        return <Navigate to="/purchases" replace />;
    }

    // Comptable: redirect to /purchases for any page they can't access
    if (profile?.role === 'comptable') {
        const allowed = COMPTABLE_ALLOWED.some(path =>
            location.pathname === path || location.pathname.startsWith(path + '/')
        );
        if (!allowed) {
            return <Navigate to="/purchases" replace />;
        }
    }

    return children;
};
