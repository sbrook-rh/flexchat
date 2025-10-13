#!/bin/bash

# Flexible Chat System - Start Script
echo "🚀 Starting Flexible Chat System..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if required ports are available
echo "🔍 Checking ports..."
check_port 5173 || exit 1
check_port 5005 || exit 1
check_port 5006 || exit 1

# Check if config file exists
if [ ! -f "config/config.json" ]; then
    echo "❌ Missing config/config.json file"
    echo "📝 Please copy an example config:"
    echo "   cp config/examples/chromadb-wrapper-example.json config/config.json"
    echo "   Then edit it to add your API keys"
    exit 1
fi

echo "✅ Configuration file found"

# Check if wrapper is needed (optional)
WRAPPER_NEEDED=false
if grep -q "chromadb-wrapper" config/config.json 2>/dev/null; then
    WRAPPER_NEEDED=true
fi

# Start RAG wrapper if needed
if [ "$WRAPPER_NEEDED" = true ]; then
    echo "🐍 Starting ChromaDB wrapper service (port 5006)..."
    cd backend/rag
    if [ ! -f "server.py" ]; then
        echo "⚠️  server.py not found - wrapper service unavailable"
        echo "   Dynamic collections will not work"
        RAG_PID=""
    else
        # Activate venv if it exists
        if [ -d "venv" ]; then
            source venv/bin/activate
            python server.py &
            RAG_PID=$!
            echo "✅ Wrapper service started with venv (PID: $RAG_PID)"
        else
            # Use system/pyenv python
            python3 server.py &
            RAG_PID=$!
            echo "✅ Wrapper service started (PID: $RAG_PID)"
        fi
    fi
    cd ../..
    # Wait for wrapper to start
    sleep 2
else
    echo "ℹ️  No chromadb-wrapper configured - skipping wrapper service"
    RAG_PID=""
fi

# Start Chat Server
echo "🟢 Starting chat server (port 5005)..."
cd backend/chat
node server.js &
CHAT_PID=$!
echo "✅ Chat server started (PID: $CHAT_PID)"
cd ../..

# Wait for chat server to start
sleep 2

# Start Frontend
echo "⚛️ Starting frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "🌐 Frontend:     http://localhost:5173"
echo "🔧 Chat Server:  http://localhost:5005"
if [ -n "$RAG_PID" ]; then
    echo "📚 RAG Wrapper:  http://localhost:5006"
fi
echo ""
echo "📖 Visit http://localhost:5173 to start chatting!"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [ -n "$RAG_PID" ]; then
        kill $RAG_PID 2>/dev/null && echo "   Stopped wrapper service"
    fi
    kill $CHAT_PID 2>/dev/null && echo "   Stopped chat server"
    kill $FRONTEND_PID 2>/dev/null && echo "   Stopped frontend"
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait
