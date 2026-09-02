import { useEffect } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export function Portfolio() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { properties, fetchPortfolio, removeProperty, isLoading, error } = usePortfolioStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
    }
  }, [isAuthenticated, fetchPortfolio]);

  const handleRemove = async (id: string) => {
    if (confirm('Remove this property from your portfolio?')) {
      await removeProperty(id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <button
          onClick={() => navigate('/search')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Property
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">{error}</div>}

      {properties.length === 0 ? (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-blue-800">No properties in your portfolio yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-4 text-left">Address</th>
                <th className="p-4 text-left">Acquisition Price</th>
                <th className="p-4 text-left">Current Value</th>
                <th className="p-4 text-left">Gain/Loss</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop) => {
                const gain = (prop.property.estimatedValue || prop.acquisitionPrice) - prop.acquisitionPrice;
                const gainPercent = (gain / prop.acquisitionPrice) * 100;
                return (
                  <tr key={prop.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-semibold">{prop.property.address}</div>
                        <div className="text-sm text-gray-600">
                          {prop.property.city}, {prop.property.state}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">${prop.acquisitionPrice.toLocaleString()}</td>
                    <td className="p-4">
                      ${(prop.property.estimatedValue || prop.acquisitionPrice).toLocaleString()}
                    </td>
                    <td className={`p-4 ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${gain.toLocaleString()} ({gainPercent.toFixed(2)}%)
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/portfolio/${prop.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRemove(prop.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
