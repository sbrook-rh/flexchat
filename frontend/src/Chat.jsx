import React, { useState, useEffect } from 'react';
import './Chat.css';
import NavBar from './NavBar';
import LogoSection from './LogoSection';

const chatApiUrl = '/chat/api';

const Chat = () => {
  const [messages, setMessages] = useState(JSON.parse(localStorage.getItem('chatMessages')) || [
    { type: 'bot', text: 'Hello! I\'m your AI assistant. How can I help you today?' }
  ]);

  const [input, setInput] = useState('');
  const [sendButtonText, setSendButtonText] = useState('Send');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryTracker, setRetryTracker] = useState(-1);

  useEffect(() => {
    if (retryTracker === -1) {
      setIsLoading(false);
      setSendButtonText('Send')
    } else {
      console.log({ retryTracker });
      const buttonStates = ['Sending..', 'Trying again....', 'One more attempt....'];
      setIsLoading(true);
      setSendButtonText(buttonStates[retryTracker]);
    }
  }, [retryTracker]);

  const handleSend = async (retryCount = 0, event) => {
    if (input.trim()) {
      const inputText = input.trim();
      const userMessage = { type: 'user', text: inputText };
      setMessages([...messages, userMessage]);
      setInput('');

      setRetryTracker(retryCount);

      try {
        const previousMessages = messages.slice(3).slice(-5).slice(0,4);

        const promptWithContext = {
          prompt: inputText,
          previousMessages,
          retryCount
        };

        const response = await fetch(chatApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(promptWithContext)
        });

        const data = await response.json();

        if (response.status === 429) {
          const retryAfter = data.retryAfter || 5;
          console.warn(`Too many requests. Retrying after ${retryAfter} seconds.`);

          if (retryCount < 2) {
            setRetryTracker(retryCount + 1);
            setTimeout(() => handleSend(retryCount + 1), retryAfter * 1000);
            return;
          } else {
            setErrorMessage('The AI assistant is currently busy. Please try again later.');
            setRetryTracker(-1);
            return;
          }
        }

        if (data.response) {
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, { type: 'bot', text: data.response }];
            localStorage.setItem('chatMessages', JSON.stringify(updatedMessages.slice(-50)));
            setRetryTracker(-1);
            return updatedMessages;
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        setErrorMessage('Network error. Please try again.');
        setRetryTracker(-1);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <LogoSection />

      {/* Chat messages container */}
      <div className="flex-grow flex justify-center px-4 pb-[180px]">
        <div className="w-full max-w-4xl">
          <div className="p-6 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className={`message-container ${message.type}`}>
                <div className={`${message.type}-message`}>
                  {message.text.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 mb-2 bg-red-100 border border-red-400 text-red-700 rounded-lg fixed bottom-[180px] left-1/2 -translate-x-1/2 max-w-md shadow-lg">
          {errorMessage}
        </div>
      )}

      {/* Chat input and send button */}
      <div className="fixed bottom-16 left-0 right-0 bg-gray-50">
        <div className="max-w-4xl mx-auto p-4 flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(0, e);
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            aria-label="Chat input area"
            className="flex-grow p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            disabled={isLoading}
          />
          <button
            className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => handleSend(0, e)}
            disabled={isLoading}
          >
            {sendButtonText}
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  );
};

export default Chat;
