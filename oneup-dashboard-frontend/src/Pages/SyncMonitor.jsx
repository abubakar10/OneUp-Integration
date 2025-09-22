import { useState, useEffect } from "react";
import axios from "axios";

function SyncMonitor() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time refresh every 2 seconds when sync is running
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [statusResponse, statsResponse] = await Promise.all([
          axios.get("http://localhost:5216/api/sync/status"),
          axios.get("http://localhost:5216/api/sync/stats")
        ]);

        setSyncStatus(statusResponse.data);
        setDbStats(statsResponse.data);
        
        // Add log entry for status updates
        if (statusResponse.data.processedRecords > 0) {
          const newLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            message: `📊 Processed: ${statusResponse.data.processedRecords} invoices | Total in DB: ${statsResponse.data.totalInvoices}`,
            type: 'info'
          };
          setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
        }
        
        setError(null);
      } catch (err) {
        console.error("Failed to fetch sync status:", err);
        setError("Failed to load sync status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus(); // Initial fetch

    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchStatus();
      }
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const startFullSync = async () => {
    try {
      setSyncing(true);
      setAutoRefresh(true);
      
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        message: "🚀 Starting full sync from OneUp API...",
        type: 'success'
      };
      setLogs(prev => [newLog, ...prev]);

      const response = await axios.post("http://localhost:5216/api/sync/trigger");
      
      const successLog = {
        id: Date.now() + 1,
        timestamp: new Date().toLocaleTimeString(),
        message: `✅ Sync job started successfully! Job ID: ${response.data.jobId}`,
        type: 'success'
      };
      setLogs(prev => [successLog, ...prev]);
      
    } catch (err) {
      console.error("Failed to trigger sync:", err);
      const errorLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Failed to start sync: ${err.message}`,
        type: 'error'
      };
      setLogs(prev => [errorLog, ...prev]);
    } finally {
      setSyncing(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (loading && !syncStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sync monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-3xl">🔄</span>
            Real-time Sync Monitor
          </h1>
          <p className="text-gray-600">Monitor invoice synchronization from OneUp API in real-time</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Total Invoices in DB</p>
                <p className="text-3xl font-bold text-blue-600">{dbStats?.totalInvoices?.toLocaleString() || 0}</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Processed This Session</p>
                <p className="text-3xl font-bold text-green-600">{syncStatus?.processedRecords?.toLocaleString() || 0}</p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">API Calls Made</p>
                <p className="text-3xl font-bold text-purple-600">{syncStatus?.apiCalls || 0}</p>
              </div>
              <div className="text-3xl">🌐</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase">Sync Status</p>
                <p className={`text-lg font-bold ${
                  syncStatus?.isRunning ? 'text-green-600' : 
                  syncStatus?.lastSyncStatus === 'completed' ? 'text-blue-600' : 
                  syncStatus?.lastSyncStatus === 'failed' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {syncStatus?.isRunning ? '🟢 Running' : 
                   syncStatus?.lastSyncStatus === 'completed' ? '✅ Completed' :
                   syncStatus?.lastSyncStatus === 'failed' ? '❌ Failed' : '⭕ Idle'}
                </p>
              </div>
              <div className="text-3xl">
                {syncStatus?.isRunning ? (
                  <div className="animate-spin">🔄</div>
                ) : '📋'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={startFullSync}
                disabled={syncing || syncStatus?.isRunning}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  syncing || syncStatus?.isRunning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? '🚀 Starting...' : 
                 syncStatus?.isRunning ? '⏳ Sync in Progress...' : 
                 '🚀 Start Full Sync'}
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Resume Auto-refresh'}
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {autoRefresh ? '🔄 Auto-refreshing every 2 seconds' : '⏸️ Auto-refresh paused'}
            </div>
          </div>
        </div>

        {/* Real-time Logs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">📝 Real-time Logs</h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-6">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">📝</div>
                <p>No logs yet. Start a sync to see real-time updates!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                      log.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                      'bg-blue-50 border-blue-400 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{log.message}</span>
                      <span className="text-xs opacity-70">{log.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600 text-2xl">💡</div>
              <div>
                <h3 className="font-medium text-blue-900">How it works</h3>
                <p className="text-sm text-blue-700">Fetches invoices from OneUp API in batches of 100</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-green-600 text-2xl">⚡</div>
              <div>
                <h3 className="font-medium text-green-900">Real-time Updates</h3>
                <p className="text-sm text-green-700">Status refreshes every 2 seconds automatically</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-purple-600 text-2xl">🎯</div>
              <div>
                <h3 className="font-medium text-purple-900">Goal</h3>
                <p className="text-sm text-purple-700">Sync all your OneUp invoices to the dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SyncMonitor;
