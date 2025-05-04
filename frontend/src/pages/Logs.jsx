import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

function Logs() {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef(null); // Ref to handle auto-scroll

  // Fetch all containers
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/containers');
        setContainers(response.data);
      } catch (error) {
        console.error('Error fetching containers:', error);
      }
    };

    fetchContainers();
  }, []);

  // Fetch logs when a container is selected
  useEffect(() => {
    if (!selectedContainer) return;
  
    const fetchLogs = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/containers/${selectedContainer.id}/logs`);
        setLogs(response.data);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLogs(`Error fetching logs: ${error.message}`);
      }
    };
  
    // Initial fetch
    fetchLogs();
  
    // Set up interval
    const intervalId = setInterval(fetchLogs, 1000);
  
    // Clear interval when component unmounts or selectedContainer changes
    return () => clearInterval(intervalId);
  }, [selectedContainer]);

  // Auto-scroll to end of logs when logs change
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="flex h-[90vh]">
      {/* Sidebar - Container list */}
      <aside className="w-1/4 bg-gray-100 border-r overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4">Containers</h2>
        {containers.map((container) => (
          <button
            key={container.id}
            onClick={() => setSelectedContainer(container)}
            className={`block w-full text-left px-4 py-2 rounded-md mb-2 text-sm font-medium
              ${selectedContainer?.id === container.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            {container.names?.[0]?.replace('/', '') || container.id.slice(0, 12)}
          </button>
        ))}
      </aside>

      {/* Main panel - Logs display */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Container Logs</h1>

        {!selectedContainer && (
          <div className="text-gray-500">Select a container to view its logs.</div>
        )}

        {selectedContainer && (
          <>
            <h2 className="text-lg font-medium text-blue-600 mb-2">
              {selectedContainer.names?.[0]?.replace('/', '') || selectedContainer.id.slice(0, 12)}
            </h2>

            <div className="bg-black text-green-400 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-[75vh] overflow-y-auto border border-gray-700">
              {loading ? 'Loading logs...' : logs || 'No logs available for this container.'}
              <div ref={logEndRef} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Logs;
