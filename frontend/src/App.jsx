import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './Home';
import Chat from './Chat';
import CollectionsRouter from './CollectionsRouter';
import ConfigBuilder from './ConfigBuilder';
import ToolTesting from './ToolTesting';
// Note: NavBar.jsx remains but is not used in new architecture

function App() {
  const [uiConfig, setUiConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = () => {
    fetch('/api/ui-config')
      .then(res => res.json())
      .then(data => {
        setUiConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load UI configuration:', err);
        setLoading(false);
      });
  };

  const reloadConfig = () => {
    // Reload config without showing loading screen
    fetch('/api/ui-config')
      .then(res => res.json())
      .then(data => setUiConfig(data))
      .catch(err => console.error('Failed to reload UI configuration:', err));
  };

  useEffect(() => {
    // Fetch UI configuration once at app level
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Configuration builder - always accessible */}
        <Route path="/config" element={<ConfigBuilder uiConfig={uiConfig} reloadConfig={reloadConfig} />} />
        
        {/* Main routes - available always (they'll show "not ready" message if needed) */}
        <Route path="/" element={<Home uiConfig={uiConfig} />} />
        <Route path="/chat" element={<Chat uiConfig={uiConfig} />} />
        <Route path="/collections" element={<CollectionsRouter uiConfig={uiConfig} reloadConfig={reloadConfig} />} />
        <Route path="/tools-testing" element={<ToolTesting uiConfig={uiConfig} />} />
      </Routes>
    </Router>
  );
}

export default App;
