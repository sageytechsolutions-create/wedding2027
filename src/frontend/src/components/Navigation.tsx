import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

export function Navigation() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          RE Investment Platform
        </Link>

        <div className="flex gap-4 items-center">
          {isAuthenticated ? (
            <>
              <Link to="/" className="hover:text-gray-300">
                Dashboard
              </Link>
              <Link to="/search" className="hover:text-gray-300">
                Search
              </Link>
              <Link to="/portfolio" className="hover:text-gray-300">
                Portfolio
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
