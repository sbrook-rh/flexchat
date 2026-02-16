import React from 'react';
import { Link } from 'react-router-dom';

const Home = ({ uiConfig }) => {
  const chatReady = uiConfig?.chatReady;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top-right navigation */}
      <div className="absolute top-4 right-4">
        <Link
          to="/config"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configuration
        </Link>
      </div>
      
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Flex Chat
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            A flexible, configurable chat system powered by AI
          </p>
          
          {/* Configuration status banner */}
          {!chatReady && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Configuration incomplete.{' '}
                  <Link to="/config" className="font-medium underline hover:text-yellow-900">
                    Configure providers
                  </Link>
                  {' '}to start chatting.
                </span>
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold mb-2">Multi-Provider Support</h3>
              <p className="text-gray-600 text-sm">
                OpenAI, Ollama, Gemini, and more - choose the AI provider that works for you
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">📚</div>
              <h3 className="text-lg font-semibold mb-2">RAG Integration</h3>
              <p className="text-gray-600 text-sm">
                Connect your knowledge bases for context-aware responses
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🔧</div>
              <h3 className="text-lg font-semibold mb-2">Test Tool Calling</h3>
              <p className="text-gray-600 text-sm">
                Try function calling against any configured model without applying changes — find out which providers and models truly support it
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {chatReady ? (
              <Link
                to="/chat"
                className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
              >
                Start Chatting →
              </Link>
            ) : (
              <Link
                to="/config"
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
              >
                Configure System →
              </Link>
            )}
            
            {/* Collections button - show if RAG services exist */}
            {uiConfig?.wrappers?.length > 0 && (
              <Link
                to="/collections"
                className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
              >
                📚 Manage Collections
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

