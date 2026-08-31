import { useEffect } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summary, fetchSummary, isLoading, error } = usePortfolioStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
    }
  }, [isAuthenticated, fetchSummary]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Properties Owned</h3>
            <p className="text-3xl font-bold">{summary.propertyCount}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Invested</h3>
            <p className="text-3xl font-bold">${summary.totalInvestedCapital.toLocaleString()}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Current Value</h3>
            <p className="text-3xl font-bold">${summary.totalCurrentValue.toLocaleString()}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Appreciation</h3>
            <p className="text-3xl font-bold text-green-600">
              ${summary.totalAppreciation.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">ROI</h3>
            <p className="text-3xl font-bold text-green-600">{summary.roi.toFixed(2)}%</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Annual Expenses</h3>
            <p className="text-3xl font-bold">${summary.totalAnnualExpenses.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-blue-800">No properties in your portfolio yet.</p>
          <button
            onClick={() => navigate('/search')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Find Properties
          </button>
        </div>
      )}
    </div>
  );
}
