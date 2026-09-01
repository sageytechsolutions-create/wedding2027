export const testUser = {
  email: 'test.user@example.com',
  password: 'TestPassword123!',
};

export const testUserNew = {
  email: `test.user.${Date.now()}@example.com`,
  password: 'NewTestPassword123!',
};

export const testProperties = [
  {
    id: 'prop_1',
    address: '456 Main Street',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 2500,
  },
  {
    id: 'prop_2',
    address: '789 Oak Avenue',
    city: 'Boulder',
    state: 'CO',
    zipCode: '80302',
    price: 550000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 3200,
  },
  {
    id: 'prop_3',
    address: '321 Pine Road',
    city: 'Fort Collins',
    state: 'CO',
    zipCode: '80521',
    price: 350000,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1800,
  },
];

export const testPortfolioProperty = {
  propertyId: 'prop_1',
  acquisitionPrice: 450000,
  acquisitionDate: new Date(2022, 2, 15), // March 15, 2022
  currentValue: 520000,
  annualRentIncome: 30000,
  annualExpenses: 9000,
};

export const testTransactions = [
  {
    portfolioPropertyId: 'portfolio_prop_1',
    transactionType: 'income',
    category: 'rent',
    amount: 2500,
    date: new Date(2024, 0, 1), // January 1, 2024
    description: 'Monthly rent payment',
  },
  {
    portfolioPropertyId: 'portfolio_prop_1',
    transactionType: 'expense',
    category: 'maintenance',
    amount: 500,
    date: new Date(2024, 0, 15), // January 15, 2024
    description: 'Roof inspection and minor repair',
  },
  {
    portfolioPropertyId: 'portfolio_prop_1',
    transactionType: 'expense',
    category: 'insurance',
    amount: 150,
    date: new Date(2024, 0, 20), // January 20, 2024
    description: 'Property insurance premium',
  },
];

export const searchFilters = {
  priceRange: {
    min: '300000',
    max: '600000',
  },
  location: 'Denver, CO',
  bedrooms: '3',
  bathrooms: '2',
};

export const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'WrongPassword123!',
};

export const incompleteForm = {
  email: 'incomplete@example.com',
  password: '', // Missing password
};
