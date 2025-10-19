import React from 'react';
import { Link } from 'react-router-dom';

const LogoSection = ({ logo, width = '20%' }) => (
  <div className="flex justify-between items-center py-4 px-6 border-b border-gray-200">
    <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">
      ← Home
    </Link>
    <div className="flex-1 flex justify-center">
      {logo ? (
        <img src={logo} alt="Company Logo" style={{ width }} className="max-w-full h-auto" />
      ) : (
        <h1 className="text-2xl font-bold text-gray-800">Flex Chat</h1>
      )}
    </div>
    <div className="w-16"></div> {/* Spacer for balance */}
  </div>
);

export default LogoSection;
