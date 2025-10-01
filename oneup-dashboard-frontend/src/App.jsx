import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./Components/Sidebar";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import Analytics from "./Pages/Analytics";
import Salespersons from "./Pages/Salespersons";
import Customers from "./Pages/Customers";
import Reports from "./Pages/Reports";
import Settings from "./Pages/Settings";
import SystemStatus from "./Pages/SystemStatus";
import TestConnection from "./Pages/TestConnection";
import SyncMonitor from "./Pages/SyncMonitor";

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
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
