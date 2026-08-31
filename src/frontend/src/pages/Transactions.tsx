import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  date: string;
  category: string;
  type: 'income' | 'expense' | 'mortgage';
  amount: number;
  property: string;
  description?: string;
}

// Mock transactions data
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2024-08-20',
    category: 'Rent Income',
    type: 'income',
    amount: 2500,
    property: '123 Oak Lane, Denver',
    description: 'August rent payment',
  },
  {
    id: '2',
    date: '2024-08-18',
    category: 'Property Tax',
    type: 'expense',
    amount: 450,
    property: '123 Oak Lane, Denver',
  },
  {
    id: '3',
    date: '2024-08-15',
    category: 'Mortgage',
    type: 'mortgage',
    amount: 1800,
    property: '123 Oak Lane, Denver',
  },
  {
    id: '4',
    date: '2024-08-10',
    category: 'Insurance',
    type: 'expense',
    amount: 120,
    property: '123 Oak Lane, Denver',
  },
  {
    id: '5',
    date: '2024-08-05',
    category: 'Maintenance',
    type: 'expense',
    amount: 350,
    property: '456 Pine Street, Denver',
    description: 'HVAC repair',
  },
  {
    id: '6',
    date: '2024-07-25',
    category: 'Rent Income',
    type: 'income',
    amount: 1800,
    property: '456 Pine Street, Denver',
  },
];

export function Transactions() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'mortgage'>('all');
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const filteredTransactions = transactions.filter(
    (t) => filterType === 'all' || t.type === filterType
  );

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalMortgage = transactions
    .filter((t) => t.type === 'mortgage')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpenses - totalMortgage;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      case 'mortgage':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'mortgage':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Transactions</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <p className="text-green-600 text-sm font-medium mb-2">Total Income</p>
          <p className="text-3xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <p className="text-red-600 text-sm font-medium mb-2">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-blue-600 text-sm font-medium mb-2">Total Mortgage</p>
          <p className="text-3xl font-bold text-blue-600">${totalMortgage.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-lg border ${netCashFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium mb-2 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Net Cash Flow
          </p>
          <p className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${netCashFlow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Transactions</h2>
        <div className="flex gap-2 flex-wrap">
          {['all', 'income', 'expense', 'mortgage'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-4 py-2 rounded-md font-medium ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Property</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{transaction.property}</td>
                  <td className="px-6 py-4 text-sm">{transaction.category}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadge(transaction.type)}`}>
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${getTypeColor(transaction.type)}`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary by Category */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Summary by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['income', 'expense'].map((type) => {
            const categories = [...new Set(transactions.filter((t) => t.type === type).map((t) => t.category))];
            const categoryTotals = categories.map((cat) => ({
              category: cat,
              total: transactions
                .filter((t) => t.type === type && t.category === cat)
                .reduce((sum, t) => sum + t.amount, 0),
            }));

            return (
              <div key={type}>
                <h3 className="text-lg font-semibold mb-3 capitalize">{type}</h3>
                <div className="space-y-2">
                  {categoryTotals.map(({ category, total }) => (
                    <div key={category} className="flex justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-700">{category}</span>
                      <span className={`font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        ${total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
