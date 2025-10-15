import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Chat from './Chat';
import Collections from './Collections';

function App() {
  // Clear model selection cache on app mount (page load/refresh)
  useEffect(() => {
    sessionStorage.removeItem('modelSelectionData');
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/collections" element={<Collections />} />
      </Routes>
    </Router>
  );
}

export default App;
