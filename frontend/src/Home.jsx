import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Flex Chat
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            A flexible, configurable chat system powered by AI
          </p>
          
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
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="text-lg font-semibold mb-2">Fully Configurable</h3>
              <p className="text-gray-600 text-sm">
                Strategy-based detection and response generation via JSON config
              </p>
            </div>
          </div>
          
          <Link
            to="/chat"
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Start Chatting →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

