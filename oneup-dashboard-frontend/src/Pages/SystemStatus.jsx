import { useState, useEffect } from "react";
import cachedApiClient from "../api/cachedApiClient";

const SystemStatus = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemStatus();
    // Refresh every 10 seconds if sync is running
    const interval = setInterval(() => {
      if (syncStatus?.isRunning) {
        fetchSystemStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [syncStatus?.isRunning]);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch sync status and database stats in parallel
      const [statusResponse, statsResponse] = await Promise.all([
        cachedApiClient.get('/sync/status', { useCache: false }),
        cachedApiClient.get('/sync/stats', { useCache: false })
      ]);

      setSyncStatus(statusResponse.data);
      setDbStats(statsResponse.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch system status:", err);
      setError("Failed to load system status");
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      const response = await cachedApiClient.post('/sync/trigger');
      
      // Show success message
      alert(`Sync started successfully! Job ID: ${response.data.jobId}`);
      
      // Refresh status immediately
      await fetchSystemStatus();
    } catch (err) {
      console.error("Failed to trigger sync:", err);
      alert("Failed to start sync. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !syncStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
          <p className="text-gray-600">Monitor your OneUp dashboard sync status and database health</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Sync Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Sync Status</h2>
              {syncStatus?.isRunning && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">Running</span>
                </div>
              )}
            </div>

            {syncStatus && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    syncStatus.isRunning ? 'text-green-600' : 
                    syncStatus.lastSyncStatus === 'completed' ? 'text-blue-600' : 
                    syncStatus.lastSyncStatus === 'failed' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {syncStatus.isRunning ? 'Running' : 
                     syncStatus.lastSyncStatus === 'completed' ? 'Completed' :
                     syncStatus.lastSyncStatus === 'failed' ? 'Failed' : 'Never Run'}
                  </span>
                </div>

                {syncStatus.lastSync && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(syncStatus.lastSync).toLocaleString()}
                    </span>
                  </div>
                )}

                {syncStatus.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {Math.floor(syncStatus.duration / 60)}m {syncStatus.duration % 60}s
                    </span>
                  </div>
                )}

                {syncStatus.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    <strong>Error:</strong> {syncStatus.errorMessage}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={triggerSync}
                disabled={syncing || syncStatus?.isRunning}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  syncing || syncStatus?.isRunning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? 'Starting Sync...' : 
                 syncStatus?.isRunning ? 'Sync in Progress...' : 
                 'Trigger Manual Sync'}
              </button>
            </div>
          </div>

          {/* Database Stats Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Statistics</h2>
            
            {dbStats && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Invoices:</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {dbStats.totalInvoices?.toLocaleString() || '0'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Employees:</span>
                  <span className="font-medium text-gray-900">
                    {dbStats.totalEmployees?.toLocaleString() || '0'}
                  </span>
                </div>

                {dbStats.latestInvoiceDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latest Invoice:</span>
                    <span className="font-medium text-gray-900">
                      {dbStats.latestInvoiceDate}
                    </span>
                  </div>
                )}

                {dbStats.oldestInvoiceDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Oldest Invoice:</span>
                    <span className="font-medium text-gray-900">
                      {dbStats.oldestInvoiceDate}
                    </span>
                  </div>
                )}

                {dbStats.databaseSize && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database Size:</span>
                    <span className="font-medium text-gray-900">
                      {dbStats.databaseSize}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Currency Breakdown */}
        {dbStats?.currencyBreakdown && dbStats.currencyBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Currency Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dbStats.currencyBreakdown.map((curr, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{curr.count}</div>
                  <div className="text-sm text-gray-600">{curr.currency}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600 text-2xl">🔄</div>
              <div>
                <h3 className="font-medium text-blue-900">Auto Sync</h3>
                <p className="text-sm text-blue-700">Runs daily at 2:00 AM</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-green-600 text-2xl">⚡</div>
              <div>
                <h3 className="font-medium text-green-900">Fast Queries</h3>
                <p className="text-sm text-green-700">SQLite database with indexes</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-purple-600 text-2xl">📊</div>
              <div>
                <h3 className="font-medium text-purple-900">Real Analytics</h3>
                <p className="text-sm text-purple-700">Based on complete dataset</p>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchSystemStatus()}
            disabled={loading}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
































