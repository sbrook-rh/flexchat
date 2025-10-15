import React from 'react';

const LogoSection = ({ logo, width = '20%' }) => (
  <div className="flex justify-center py-4 px-6">
    {logo ? (
      <img src={logo} alt="Company Logo" style={{ width }} className="max-w-full h-auto" />
    ) : (
      <h1 className="text-2xl font-bold text-gray-800">Flex Chat</h1>
    )}
  </div>
);

export default LogoSection;
