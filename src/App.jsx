import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ItemMaster from './pages/ItemMaster';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import CurrentStock from './pages/CurrentStock';
import Masters from './pages/Masters';
import Tools from './pages/Tools';
import Alerts from './pages/Alerts';

// Optional: Protected Route Wrapper if you want to keep authentication logic
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Layout Routes */}
          <Route path="/" element={<Layout />}>
            {/* Redirect / to /dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Add more template routes here */}
            <Route path="item-master" element={<ItemMaster />} />
            <Route path="stock-in" element={<StockIn />} />
            <Route path="stock-out" element={<StockOut />} />
            <Route path="current-stock" element={<CurrentStock />} />
            <Route path="tools" element={<Tools />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="masters" element={<Masters />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
