import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Navigation } from './components/Navigation';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { PropertySearch } from './pages/PropertySearch';
import { PropertyDetail } from './pages/PropertyDetail';
import { Portfolio } from './pages/Portfolio';
import { MarketAnalysis } from './pages/MarketAnalysis';
import { Transactions } from './pages/Transactions';
import { DealRecommendations } from './pages/DealRecommendations';
import { PortfolioAnalytics } from './pages/PortfolioAnalytics';
import { PropertyComparison } from './pages/PropertyComparison';
import { MarketHeatmap } from './pages/MarketHeatmap';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/search" element={<PropertySearch />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/recommendations" element={isAuthenticated ? <DealRecommendations /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isAuthenticated ? <PortfolioAnalytics /> : <Navigate to="/login" />} />
        <Route path="/compare" element={isAuthenticated ? <PropertyComparison /> : <Navigate to="/login" />} />
        <Route path="/heatmap" element={isAuthenticated ? <MarketHeatmap /> : <Navigate to="/login" />} />
        <Route path="/portfolio" element={isAuthenticated ? <Portfolio /> : <Navigate to="/login" />} />
        <Route path="/transactions" element={isAuthenticated ? <Transactions /> : <Navigate to="/login" />} />
        <Route path="/market" element={<MarketAnalysis />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
