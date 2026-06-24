import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, sellerOnly = false }) => {
    const { isAuthenticated, isSeller } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (sellerOnly && !isSeller) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
