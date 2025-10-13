#!/bin/bash

# Flexible Chat System - Setup Script
echo "🔧 Setting up Flexible Chat System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend/chat
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
cd ../..

# Install RAG wrapper dependencies (optional - for dynamic collections)
echo "📦 Installing RAG wrapper dependencies (optional)..."
echo ""

# Check if venv already exists
if [ -d "backend/rag/venv" ]; then
    echo "✅ Using existing virtual environment"
    cd backend/rag
    source venv/bin/activate
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "⚠️  Failed to install dependencies"
    fi
    deactivate
    cd ../..
    
# Check if pyenv local version is set
elif [ -f "backend/rag/.python-version" ]; then
    echo "✅ Using pyenv local version: $(cat backend/rag/.python-version)"
    cd backend/rag
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "⚠️  Failed to install dependencies"
    fi
    cd ../..
    
# Nothing set up yet - provide guidance
else
    if command -v pyenv &> /dev/null; then
        echo "ℹ️  pyenv detected but no Python environment configured for RAG wrapper"
        echo ""
        echo "   Choose your preferred setup:"
        echo "   1. Use pyenv:  cd backend/rag && pyenv local <version> && pip install -r requirements.txt"
        echo "   2. Use venv:   cd backend/rag && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        echo ""
        echo "   Skipping for now. You can set this up later."
    else
        echo "ℹ️  No Python environment manager detected - creating virtual environment..."
        cd backend/rag
        python3 -m venv venv
        if [ $? -eq 0 ]; then
            source venv/bin/activate
            pip install -r requirements.txt
            if [ $? -eq 0 ]; then
                echo "✅ Virtual environment created and dependencies installed"
            else
                echo "⚠️  Failed to install dependencies"
            fi
            deactivate
        else
            echo "⚠️  Failed to create virtual environment"
        fi
        cd ../..
    fi
fi
echo ""

# Create configuration file if it doesn't exist
echo "📝 Setting up configuration..."

if [ ! -f "config/config.json" ]; then
    echo "📋 No config.json found. Please copy an example:"
    echo "   - For chat-only: cp config/examples/chat-only.json config/config.json"
    echo "   - For wrapper with collections: cp config/examples/chromadb-wrapper-example.json config/config.json"
    echo "   - For direct ChromaDB: cp config/examples/chromadb-direct-server.json config/config.json"
    echo ""
    echo "   Then edit config/config.json and add your API keys"
else
    echo "✅ config/config.json already exists"
fi

# Create .env files if they don't exist (for wrapper service)
if [ ! -f "backend/rag/.env" ]; then
    if [ -f "backend/rag/env.example" ]; then
        cp backend/rag/env.example backend/rag/.env
        echo "✅ Created backend/rag/.env (add your OpenAI API key if using wrapper)"
    fi
else
    echo "✅ backend/rag/.env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create config/config.json from an example (see above)"
echo "2. Add your API keys to config/config.json"
echo "3. (Optional) Add OpenAI API key to backend/rag/.env if using wrapper"
echo "4. Run ./start.sh to start the application"
echo ""
echo "📚 Documentation:"
echo "- README.md - Getting started and overview"
echo "- docs/ARCHITECTURE.md - System architecture"
echo "- docs/COLLECTION_MANAGEMENT.md - Dynamic collections guide"
echo "- config/README.md - Configuration guide"
