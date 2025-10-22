import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownName]: !prev[dropdownName]
    }));
  };

  const links = [
    { name: "Dashboard", path: "/", icon: "📊" },
    { name: "Sync Monitor", path: "/sync-monitor", icon: "🔄" },
    { name: "Analytics", path: "/analytics", icon: "📈" },
    { 
      name: "Finance Reports", 
      icon: "💰", 
      type: "dropdown",
      children: [
        { name: "Bills Reports", path: "/bills-reports", icon: "📋" },
        { name: "Invoices Paid Reports", path: "/invoices-paid-reports", icon: "💳" }
      ]
    },
    { 
      name: "Sales Report", 
      icon: "📊", 
      type: "dropdown",
      children: [
        { name: "Salespersons", path: "/salespersons", icon: "👥" },
        { name: "Customers", path: "/customers", icon: "🏢" }
      ]
    },
    { name: "Reports", path: "/reports", icon: "📋" },
    { name: "System Status", path: "/system-status", icon: "⚙️" },
    { name: "Settings", path: "/settings", icon: "🔧" },
  ];

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-gray-900 to-black text-white min-h-screen flex flex-col transition-all duration-300 shadow-xl`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                OneUp
              </h2>
              <p className="text-xs text-gray-400 mt-1">Sales Dashboard</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-lg">{isCollapsed ? "→" : "←"}</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 p-4 flex-1">
        {links.map((link) => {
          if (link.type === "dropdown") {
            const isOpen = openDropdowns[link.name];
            return (
              <div key={link.name} className="relative">
                <button
                  onClick={() => toggleDropdown(link.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group hover:bg-gray-800 hover:shadow-md hover:translate-x-1 ${
                    isOpen ? "bg-gray-800" : ""
                  }`}
                  title={isCollapsed ? link.name : ""}
                >
                  <span className="text-xl flex-shrink-0">{link.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="font-medium group-hover:text-blue-300 transition-colors flex-1 text-left">
                        {link.name}
                      </span>
                      <span className={`text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </>
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {!isCollapsed && isOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {link.children.map((child) => (
                      <NavLink
                        key={child.name}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group ${
                            isActive 
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-white" 
                              : "hover:bg-gray-700 hover:shadow-md hover:translate-x-1"
                          }`
                        }
                      >
                        <span className="text-lg flex-shrink-0">{child.icon}</span>
                        <span className="font-medium group-hover:text-blue-300 transition-colors text-sm">
                          {child.name}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-white" 
                      : "hover:bg-gray-800 hover:shadow-md hover:translate-x-1"
                  }`
                }
                title={isCollapsed ? link.name : ""}
              >
                <span className="text-xl flex-shrink-0">{link.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium group-hover:text-blue-300 transition-colors">
                    {link.name}
                  </span>
                )}
              </NavLink>
            );
          }
        })}
        
        {/* User Info & Logout - Moved up under navigation links */}
        {user && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {!isCollapsed ? (
              <div className="mb-3">
                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 flex justify-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-red-600 hover:shadow-md group"
              title={isCollapsed ? "Logout" : ""}
            >
              <span className="text-xl flex-shrink-0">🚪</span>
              {!isCollapsed && (
                <span className="font-medium group-hover:text-red-200 transition-colors">
                  Logout
                </span>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 mt-auto">
        {!isCollapsed ? (
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-400 to-blue-400 rounded-lg p-3 mb-3">
              <div className="text-lg font-bold">🚀</div>
              <div className="text-xs font-medium">System Status</div>
              <div className="text-xs text-green-200">All Systems Online</div>
            </div>
            <p className="text-xs text-gray-400">
              v2.1.0 • {new Date().getFullYear()}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lg">🚀</div>
            <div className="text-xs text-green-400">●</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;