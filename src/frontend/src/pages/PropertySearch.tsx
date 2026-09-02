import { useState, useEffect } from 'react';
import { usePropertyStore, Property } from '../store/propertyStore';
import { useNavigate } from 'react-router-dom';

export function PropertySearch() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    minBeds: '',
  });

  const { properties, pagination, isLoading, error, search } = usePropertyStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search({
      ...filters,
      minPrice: filters.minPrice ? parseInt(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? parseInt(filters.maxPrice) : undefined,
      minBeds: filters.minBeds ? parseInt(filters.minBeds) : undefined,
    });
  };

  useEffect(() => {
    search({});
  }, []);

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Find Properties</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            placeholder="State"
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Min Price"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Min Beds"
            value={filters.minBeds}
            onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property: Property) => (
          <div
            key={property.id}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handlePropertyClick(property.id)}
          >
            {property.propertyImageUrl && (
              <img
                src={property.propertyImageUrl}
                alt={property.address}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{property.address}</h3>
              <p className="text-gray-600 mb-2">
                {property.city}, {property.state} {property.zipCode}
              </p>
              <div className="flex justify-between mb-2">
                <span className="text-sm">
                  {property.bedrooms} bed {property.bathrooms} bath
                </span>
                <span className="text-sm">{property.squareFeet?.toLocaleString()} sqft</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                ${property.estimatedValue?.toLocaleString() || property.listPrice?.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="mt-8 text-center text-gray-600">
          Page {pagination.page} of {pagination.pages} ({pagination.total} total)
        </div>
      )}
    </div>
  );
}
