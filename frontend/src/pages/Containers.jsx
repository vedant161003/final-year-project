import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCw, AlertCircle } from 'lucide-react';

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newContainer, setNewContainer] = useState({
    image: '',
    tag: 'latest',
    name: '',
    env: [],
    ports: []
  });

  const fetchContainers = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/containers');
      if (!response.ok) throw new Error('Failed to fetch containers');
      const data = await response.json();
      setContainers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateContainer = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8080/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContainer)
      });
      
      if (!response.ok) throw new Error('Failed to create container');
      await fetchContainers();
      setNewContainer({ image: '', tag: 'latest', name: '', env: [], ports: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContainer = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/api/containers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete container');
      await fetchContainers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && containers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RotateCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Containers</h1>
        <button 
          onClick={fetchContainers}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Refresh containers"
        >
          <RotateCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg flex items-center space-x-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New Container</h2>
        <form onSubmit={handleCreateContainer} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Image Name</label>
              <input
                type="text"
                value={newContainer.image}
                onChange={(e) => setNewContainer({ ...newContainer, image: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="nginx"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tag</label>
              <input
                type="text"
                value={newContainer.tag}
                onChange={(e) => setNewContainer({ ...newContainer, tag: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="latest"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Container Name</label>
              <input
                type="text"
                value={newContainer.name}
                onChange={(e) => setNewContainer({ ...newContainer, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="my-nginx"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Container
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Active Containers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {containers.map((container) => (
                  <tr key={container.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{container.names[0].substring(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{container.image}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        container.state === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {container.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(container.created * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteContainer(container.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Containers;