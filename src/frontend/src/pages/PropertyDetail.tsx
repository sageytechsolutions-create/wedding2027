import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyStore, Property } from '../store/propertyStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { AIAnalysis } from '../components/AIAnalysis';

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { getById } = usePropertyStore();
  const { addProperty } = usePortfolioStore();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionPrice: '',
    downPayment: '',
    annualPropertyTax: '',
    annualInsurance: '',
    annualMaintenanceEstimate: '',
  });

  useEffect(() => {
    if (!id) return;

    const loadProperty = async () => {
      setIsLoading(true);
      try {
        const data = await getById(id);
        setProperty(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setIsLoading(false);
      }
    };

    loadProperty();
  }, [id, getById]);

  const handleAddToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !id) return;

    try {
      await addProperty({
        propertyId: id,
        acquisitionDate: new Date(formData.acquisitionDate),
        acquisitionPrice: parseFloat(formData.acquisitionPrice),
        downPayment: formData.downPayment ? parseFloat(formData.downPayment) : undefined,
        annualPropertyTax: formData.annualPropertyTax ? parseFloat(formData.annualPropertyTax) : undefined,
        annualInsurance: formData.annualInsurance ? parseFloat(formData.annualInsurance) : undefined,
        annualMaintenanceEstimate: formData.annualMaintenanceEstimate ? parseFloat(formData.annualMaintenanceEstimate) : undefined,
      });
      navigate('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add property');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading property details...</div>;
  }

  if (error || !property) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">{error || 'Property not found'}</div>
        <button
          onClick={() => navigate('/search')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Property Info */}
        <div className="lg:col-span-2">
          {property.propertyImageUrl && (
            <img
              src={property.propertyImageUrl}
              alt={property.address}
              className="w-full h-96 object-cover rounded-lg mb-6"
            />
          )}

          <h1 className="text-4xl font-bold mb-2">{property.address}</h1>
          <p className="text-xl text-gray-600 mb-6">
            {property.city}, {property.state} {property.zipCode}
          </p>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 text-sm">Type</span>
                <p className="text-lg font-semibold capitalize">{property.propertyType}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Year Built</span>
                <p className="text-lg font-semibold">{property.yearBuilt}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Bedrooms</span>
                <p className="text-lg font-semibold">{property.bedrooms}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Bathrooms</span>
                <p className="text-lg font-semibold">{property.bathrooms}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Square Feet</span>
                <p className="text-lg font-semibold">{property.squareFeet?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Lot Size</span>
                <p className="text-lg font-semibold">{property.lotSize?.toLocaleString()} sqft</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 text-sm">List Price</span>
                <p className="text-2xl font-bold text-blue-600">
                  ${property.listPrice?.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Estimated Value</span>
                <p className="text-2xl font-bold text-green-600">
                  ${property.estimatedValue?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {property.bedrooms && property.bathrooms && property.squareFeet && (
            <AIAnalysis
              propertyId={id!}
              features={{
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                squareFeet: property.squareFeet,
                lotSize: property.lotSize || 0,
                yearBuilt: property.yearBuilt || 2000,
                city: property.city,
                state: property.state,
                zipCode: property.zipCode,
              }}
            />
          )}
        </div>

        {/* Sidebar - Add to Portfolio */}
        <div className="lg:col-span-1">
          {isAuthenticated ? (
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Add to Portfolio</h2>

              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-semibold"
                >
                  + Add Property
                </button>
              ) : (
                <form onSubmit={handleAddToPortfolio} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acquisition Date
                    </label>
                    <input
                      type="date"
                      value={formData.acquisitionDate}
                      onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acquisition Price *
                    </label>
                    <input
                      type="number"
                      value={formData.acquisitionPrice}
                      onChange={(e) => setFormData({ ...formData, acquisitionPrice: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Down Payment
                    </label>
                    <input
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Property Tax
                    </label>
                    <input
                      type="number"
                      value={formData.annualPropertyTax}
                      onChange={(e) => setFormData({ ...formData, annualPropertyTax: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Insurance
                    </label>
                    <input
                      type="number"
                      value={formData.annualInsurance}
                      onChange={(e) => setFormData({ ...formData, annualInsurance: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Maintenance Estimate
                    </label>
                    <input
                      type="number"
                      value={formData.annualMaintenanceEstimate}
                      onChange={(e) => setFormData({ ...formData, annualMaintenanceEstimate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-blue-800 mb-4">Sign in to add this property to your portfolio.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
