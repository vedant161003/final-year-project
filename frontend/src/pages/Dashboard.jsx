import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, RotateCw } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      
      // Process the stats data
      const processedStats = {
        activeContainers: data.activeContainers,
        totalImages: data.totalImages,
        containerEvents: data.containerEvents,
        uptime: Math.floor(data.uptime / 3600), // Convert to hours
        memoryUsage: Math.round(data.memoryUsage.heapUsed / 1024 / 1024) // Convert to MB
      };
      
      setStats(processedStats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RotateCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg flex items-center space-x-2 text-red-800">
        <AlertCircle className="h-5 w-5" />
        <span>Error loading dashboard: {error}</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Containers', value: stats.activeContainers },
    { label: 'Total Images', value: stats.totalImages },
    { label: 'Container Events (24h)', value: stats.containerEvents },
    { label: 'Uptime (hours)', value: stats.uptime },
    { label: 'Memory Usage (MB)', value: stats.memoryUsage }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button 
          onClick={fetchStats}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Refresh stats"
        >
          <RotateCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Container Events</h2>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Start', value: stats.containerEvents },
              { name: 'Stop', value: Math.round(stats.containerEvents * 0.8) },
              { name: 'Restart', value: Math.round(stats.containerEvents * 0.2) }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;