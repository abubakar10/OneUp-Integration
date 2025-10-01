import { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

function TestConnection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log("Testing API connection...");
        
        // Direct axios call without caching
        const response = await apiClient.get("/invoices?page=1&pageSize=100");
        
        console.log("API Response:", response.data);
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error("API Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Testing API connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-2xl">
          <div className="text-red-500 text-4xl mb-4 text-center">❌</div>
          <h2 className="text-xl font-bold text-red-600 mb-4 text-center">API Connection Failed</h2>
          <p className="text-red-600 mb-4"><strong>Error:</strong> {error}</p>
          <div className="bg-gray-100 p-4 rounded text-sm">
            <p><strong>Troubleshooting:</strong></p>
            <ul className="list-disc ml-4 mt-2">
              <li>Make sure API server is running on http://localhost:5216</li>
              <li>Check CORS settings</li>
              <li>Verify database has data</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-green-600 mb-4 text-center">✅ API Connection Successful!</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{data?.totalCount || 0}</div>
              <div className="text-sm text-blue-600">Total Invoices</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{data?.count || 0}</div>
              <div className="text-sm text-green-600">Showing</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{data?.page || 1}</div>
              <div className="text-sm text-purple-600">Page</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{data?.pageSize || 0}</div>
              <div className="text-sm text-orange-600">Page Size</div>
            </div>
          </div>

          {data?.data && data.data.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Invoices:</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Invoice #</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Customer</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.slice(0, 10).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {item.invoice?.invoice_number || item.invoice?.id}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {item.invoice?.customer_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {item.invoice?.invoice_date}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-bold text-green-600">
                          {parseFloat(item.invoice?.total || 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {item.invoice?.currency}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Raw API Response:</h3>
          <pre className="text-xs bg-white p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default TestConnection;
