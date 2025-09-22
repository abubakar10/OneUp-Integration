import { useState, useEffect } from "react";

// Settings Card Component
const SettingsCard = ({ icon, title, children, description }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xl">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
      {description && <div className="text-xs text-gray-500">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

function Settings() {
  const [settings, setSettings] = useState({
    // Display Settings
    theme: 'light',
    pageSize: 25,
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    salesAlerts: true,
    
    // Performance Settings
    autoRefresh: false,
    refreshInterval: 30,
    cacheEnabled: true,
    
    // Privacy Settings
    dataSharing: false,
    analytics: true,
    
    // API Settings
    apiTimeout: 30,
    retryAttempts: 3
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        theme: 'light',
        pageSize: 25,
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        emailNotifications: true,
        pushNotifications: false,
        weeklyReports: true,
        salesAlerts: true,
        autoRefresh: false,
        refreshInterval: 30,
        cacheEnabled: true,
        dataSharing: false,
        analytics: true,
        apiTimeout: 30,
        retryAttempts: 3
      };
      setSettings(defaultSettings);
      localStorage.setItem('dashboardSettings', JSON.stringify(defaultSettings));
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'dashboard-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">⚙️</span>
                Dashboard Settings
              </h1>
              <p className="text-gray-600 mt-1">Customize your dashboard experience</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button
                onClick={exportSettings}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                📤 Export
              </button>
              <button
                onClick={resetSettings}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                🔄 Reset
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                💾 Save Settings
              </button>
            </div>
          </div>
          {saved && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg text-green-800 text-sm">
              ✅ Settings saved successfully!
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Display Settings */}
          <SettingsCard 
            icon="🎨" 
            title="Display Settings" 
            description="Customize the appearance and layout"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="light">🌞 Light</option>
                  <option value="dark">🌙 Dark</option>
                  <option value="auto">🔄 Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Page Size</label>
                <select
                  value={settings.pageSize}
                  onChange={(e) => updateSetting('pageSize', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">🇺🇸 USD - US Dollar</option>
                  <option value="PKR">🇵🇰 PKR - Pakistani Rupee</option>
                  <option value="AED">🇦🇪 AED - UAE Dirham</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => updateSetting('dateFormat', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
              </div>
            </div>
          </SettingsCard>

          {/* Notification Settings */}
          <SettingsCard 
            icon="🔔" 
            title="Notification Settings" 
            description="Manage alerts and notifications"
          >
            <div className="space-y-4">
              <ToggleSwitch
                enabled={settings.emailNotifications}
                onChange={(value) => updateSetting('emailNotifications', value)}
                label="Email Notifications"
                description="Receive important updates via email"
              />
              <ToggleSwitch
                enabled={settings.pushNotifications}
                onChange={(value) => updateSetting('pushNotifications', value)}
                label="Push Notifications"
                description="Browser notifications for real-time alerts"
              />
              <ToggleSwitch
                enabled={settings.weeklyReports}
                onChange={(value) => updateSetting('weeklyReports', value)}
                label="Weekly Reports"
                description="Automated weekly performance summaries"
              />
              <ToggleSwitch
                enabled={settings.salesAlerts}
                onChange={(value) => updateSetting('salesAlerts', value)}
                label="Sales Alerts"
                description="Notifications for significant sales events"
              />
            </div>
          </SettingsCard>

          {/* Performance Settings */}
          <SettingsCard 
            icon="⚡" 
            title="Performance Settings" 
            description="Optimize dashboard performance"
          >
            <div className="space-y-4">
              <ToggleSwitch
                enabled={settings.autoRefresh}
                onChange={(value) => updateSetting('autoRefresh', value)}
                label="Auto Refresh"
                description="Automatically refresh data periodically"
              />
              
              {settings.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <ToggleSwitch
                enabled={settings.cacheEnabled}
                onChange={(value) => updateSetting('cacheEnabled', value)}
                label="Enable Caching"
                description="Cache data for faster loading times"
              />
            </div>
          </SettingsCard>

          {/* Privacy Settings */}
          <SettingsCard 
            icon="🔐" 
            title="Privacy Settings" 
            description="Control data sharing and privacy"
          >
            <div className="space-y-4">
              <ToggleSwitch
                enabled={settings.dataSharing}
                onChange={(value) => updateSetting('dataSharing', value)}
                label="Data Sharing"
                description="Share anonymized data for product improvement"
              />
              <ToggleSwitch
                enabled={settings.analytics}
                onChange={(value) => updateSetting('analytics', value)}
                label="Usage Analytics"
                description="Track usage patterns to improve experience"
              />
            </div>
          </SettingsCard>

          {/* API Settings */}
          <SettingsCard 
            icon="🔌" 
            title="API Settings" 
            description="Configure API connection parameters"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.apiTimeout}
                  onChange={(e) => updateSetting('apiTimeout', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.retryAttempts}
                  onChange={(e) => updateSetting('retryAttempts', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </SettingsCard>

          {/* System Information */}
          <SettingsCard 
            icon="ℹ️" 
            title="System Information" 
            description="Dashboard and system details"
          >
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Dashboard Version:</span>
                <span className="font-medium">v2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Version:</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Browser:</span>
                <span className="font-medium">{navigator.userAgent.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Size:</span>
                <span className="font-medium">2.4 MB</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  localStorage.clear();
                  alert('Cache cleared successfully!');
                }}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🗑️ Clear Cache & Storage
              </button>
            </div>
          </SettingsCard>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>OneUp Sales Dashboard • Built with React & Tailwind CSS</p>
          <p className="mt-1">
            For support, contact: 
            <a href="mailto:support@example.com" className="text-blue-500 hover:underline ml-1">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;