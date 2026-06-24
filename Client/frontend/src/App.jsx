import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './components/home';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import OrderRooms from './components/OrderRooms';
import RoomDetail from './components/RoomDetail';
import Checkout from './components/Checkout';
import RoomCheckout from './components/RoomCheckout';
import PurchaseHistory from './components/PurchaseHistory';
import SellerDashboard from './components/SellerDashboard';
import JoinRoom from './components/JoinRoom'; 
import ProtectedRoute from './components/ProtectedRoute';
import AdminPanel from './components/AdminPanel';
import './App.css';

/* Show Home before login, Products after login */
const RootPage = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Products /> : <Home />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<RootPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/orders" element={
              <ProtectedRoute><OrderRooms /></ProtectedRoute>
            } />
            <Route path="/orders/:roomCode" element={
              <ProtectedRoute><RoomDetail /></ProtectedRoute>
            } />
            <Route path="/join/:roomCode" element={<JoinRoom />} />
            <Route path="/seller/dashboard" element={
              <ProtectedRoute><SellerDashboard /></ProtectedRoute>
            } />
            <Route path="/purchase-history" element={
              <ProtectedRoute><PurchaseHistory /></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute><Checkout /></ProtectedRoute>
            } />
            <Route path="/room-checkout/:roomCode" element={
              <ProtectedRoute><RoomCheckout /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><AdminPanel /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
