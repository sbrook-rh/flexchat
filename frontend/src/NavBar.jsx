import React from 'react';
import { Link } from 'react-router-dom';

const NavBar = () => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
    <nav className="flex justify-center items-center gap-4 p-4">
      <Link 
        to="/" 
        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors"
      >
        Home
      </Link>
      <Link 
        to="/chat" 
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
      >
        Chat
      </Link>
    </nav>
  </div>
);

export default NavBar;
