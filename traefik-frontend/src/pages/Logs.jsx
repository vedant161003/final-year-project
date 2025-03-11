import React, { useState, useEffect } from 'react';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulated logs - replace with actual API calls
    setLogs([
      { timestamp: '2024-03-15 10:30:22', level: 'info', message: 'Container nginx-test started' },
      { timestamp: '2024-03-15 10:30:20', level: 'error', message: 'Failed to start container redis-cache' },
      // Add more log entries as needed
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">System Logs</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs
                .filter(log => filter === 'all' || log.level === filter)
                .map((log, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.timestamp}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.level === 'error' ? 'bg-red-100 text-red-800' : 
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.message}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Logs;
