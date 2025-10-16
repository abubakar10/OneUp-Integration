import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./Components/ProtectedRoute";
import Sidebar from "./Components/Sidebar";
import Login from "./Pages/Login";

// ✅ Lazy load components for better performance
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const Analytics = lazy(() => import("./Pages/Analytics"));
const Salespersons = lazy(() => import("./Pages/Salespersons"));
const Customers = lazy(() => import("./Pages/Customers"));
const Reports = lazy(() => import("./Pages/Reports"));
const Settings = lazy(() => import("./Pages/Settings"));
const SystemStatus = lazy(() => import("./Pages/SystemStatus"));
const TestConnection = lazy(() => import("./Pages/TestConnection"));
const SyncMonitor = lazy(() => import("./Pages/SyncMonitor"));

// ✅ Loading component for lazy-loaded routes
const LoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading page...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex bg-gray-100 min-h-screen">
              {/* Sidebar */}
              <Sidebar />

              {/* Main content */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/test" element={<TestConnection />} />
                    <Route path="/sync-monitor" element={<SyncMonitor />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/salespersons" element={<Salespersons />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/system-status" element={<SystemStatus />} />
                  </Routes>
                </Suspense>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
