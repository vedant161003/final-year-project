import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Containers from './pages/Containers';
import Logs from './pages/Logs';
import DockerOverview from './pages/DockerOverview';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/containers" element={<Containers />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/overview" element={<DockerOverview />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
