from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import requests

# Load environment variables
load_dotenv()

# Embedding provider configuration
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "ollama").lower()
print(f"🔧 Embedding provider: {EMBEDDING_PROVIDER}")

# Initialize embedding provider
embedding_config = {}

if EMBEDDING_PROVIDER == "openai":
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if not openai.api_key:
        print("❌ ERROR: OPENAI_API_KEY is not set in .env file!")
        exit(1)
    embedding_config["model"] = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
    print(f"✅ OpenAI configured with model: {embedding_config['model']}")

elif EMBEDDING_PROVIDER == "gemini":
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY is not set in .env file!")
        exit(1)
    genai.configure(api_key=api_key)
    embedding_config["model"] = os.getenv("GEMINI_EMBEDDING_MODEL", "models/embedding-001")
    print(f"✅ Gemini configured with model: {embedding_config['model']}")

elif EMBEDDING_PROVIDER == "ollama":
    embedding_config["base_url"] = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    embedding_config["model"] = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    print(f"✅ Ollama configured at {embedding_config['base_url']} with model: {embedding_config['model']}")

else:
    print(f"❌ ERROR: Unknown EMBEDDING_PROVIDER '{EMBEDDING_PROVIDER}'. Supported: openai, gemini, ollama")
    exit(1)


def generate_embedding(text: str, provider: str = None, model: str = None) -> List[float]:
    """
    Generate embedding using specified or default provider
    
    Args:
        text: Text to embed
        provider: Embedding provider (openai, gemini, ollama) - uses default if not specified
        model: Model name - uses default for provider if not specified
    """
    # Use defaults if not specified
    provider = provider or EMBEDDING_PROVIDER
    model = model or embedding_config.get("model")
    
    try:
        if provider == "openai":
            import openai
            response = openai.embeddings.create(
                input=text,
                model=model
            )
            return response.data[0].embedding
        
        elif provider == "gemini":
            import google.generativeai as genai
            result = genai.embed_content(
                model=model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        
        elif provider == "ollama":
            base_url = embedding_config.get("base_url", "http://localhost:11434")
            response = requests.post(
                f"{base_url}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text
                }
            )
            response.raise_for_status()
            return response.json()["embedding"]
        
        else:
            raise ValueError(f"Unknown embedding provider: {provider}")
        
    except Exception as e:
        print(f"❌ ERROR generating embedding with {provider}/{model}: {e}")
        raise

# Initialize FastAPI
app = FastAPI(title="ChromaDB Wrapper Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB
print("🔄 Connecting to ChromaDB...")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
print("✅ ChromaDB initialized.")

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    collection: Optional[str] = None  # Allow dynamic collection selection

class CreateCollectionRequest(BaseModel):
    name: str
    metadata: Optional[Dict[str, Any]] = {}
    embedding_provider: Optional[str] = None  # Override default provider (openai, gemini, ollama)
    embedding_model: Optional[str] = None     # Override default model

class AddDocumentsRequest(BaseModel):
    documents: List[Dict[str, Any]]  # Each doc: {text: str, metadata: dict, id?: str}
    embedding_provider: Optional[str] = None  # Override default provider
    embedding_model: Optional[str] = None     # Override default model

class UpdateCollectionMetadataRequest(BaseModel):
    metadata: Dict[str, Any]


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - service info"""
    return {
        "service": "ChromaDB Wrapper",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        collections = chroma_client.list_collections()
        return {
            "status": "healthy",
            "collections_count": len(collections)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }, 503


@app.get("/query")
async def readiness_check():
    """
    Readiness probe for OpenShift/K8s
    """
    try:
        collections = chroma_client.list_collections()
        return {"status": "ready", "collections": len(collections)}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 503


# Collection management endpoints
@app.get("/collections")
def list_collections():
    """List all collections with metadata"""
    try:
        # In ChromaDB v0.6.0, list_collections returns just names
        collection_names = chroma_client.list_collections()
        result = []
        
        for name in collection_names:
            try:
                # Get the full collection object
                collection = chroma_client.get_collection(name=name)
                count = collection.count()
                metadata = collection.metadata or {}
                result.append({
                    "name": name,
                    "count": count,
                    "metadata": metadata
                })
            except Exception as e:
                print(f"⚠️ Error getting info for collection {name}: {e}")
                result.append({
                    "name": name,
                    "count": 0,
                    "metadata": {},
                    "error": str(e)
                })
        
        return {"collections": result}
    except Exception as e:
        print(f"❌ ERROR listing collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/collections/{name}")
def get_collection(name: str):
    """Get collection details with metadata"""
    try:
        collection = chroma_client.get_collection(name=name)
        return {
            "name": collection.name,
            "count": collection.count(),
            "metadata": collection.metadata or {}
        }
    except Exception as e:
        print(f"❌ ERROR getting collection {name}: {e}")
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found")


@app.post("/collections")
def create_collection(request: CreateCollectionRequest):
    """Create a new collection with metadata"""
    try:
        # Check if collection already exists
        try:
            existing = chroma_client.get_collection(name=request.name)
            raise HTTPException(status_code=400, detail=f"Collection '{request.name}' already exists")
        except:
            pass  # Collection doesn't exist, proceed
        
        # Determine which embedding provider/model to use
        # Priority: API request > defaults from .env
        provider = request.embedding_provider or EMBEDDING_PROVIDER
        model = request.embedding_model or embedding_config.get("model")
        
        # Validate provider is configured
        if provider not in ["openai", "gemini", "ollama"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported embedding provider: {provider}. Supported: openai, gemini, ollama"
            )
        
        # Automatically add embedding provider info to metadata
        collection_metadata = request.metadata or {}
        collection_metadata["embedding_provider"] = provider
        collection_metadata["embedding_model"] = model
        
        # Create collection with cosine distance for normalized embeddings
        # Note: ChromaDB uses 'hnsw:space' in metadata to set distance function
        collection = chroma_client.create_collection(
            name=request.name,
            metadata={
                **collection_metadata,
                "hnsw:space": "cosine"  # Use cosine distance for text embeddings (not L2)
            }
        )
        
        print(f"✅ Created collection: {request.name} (embedding: {provider}/{model}, distance: cosine)")
        return {
            "status": "created",
            "name": request.name,
            "metadata": collection.metadata
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR creating collection {request.name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/collections/{name}/metadata")
def update_collection_metadata(name: str, request: UpdateCollectionMetadataRequest):
    """Update collection metadata"""
    try:
        collection = chroma_client.get_collection(name=name)
        
        # Get existing metadata and merge with updates
        # existing_metadata = collection.metadata or {}
        # updated_metadata = {**existing_metadata, **request.metadata}
        updated_metadata = request.metadata
        
        # Use ChromaDB's modify method to update metadata
        collection.modify(metadata=updated_metadata)
        
        print(f"✅ Updated metadata for collection: {name}")
        return {
            "status": "updated",
            "name": name,
            "metadata": updated_metadata
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR updating collection metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collections/{name}")
def delete_collection(name: str):
    """Delete a collection"""
    try:
        chroma_client.delete_collection(name=name)
        print(f"🗑️ Deleted collection: {name}")
        return {
            "status": "deleted",
            "name": name
        }
    except Exception as e:
        print(f"❌ ERROR deleting collection {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Document management endpoints
@app.post("/collections/{collection_name}/documents")
def add_documents(collection_name: str, request: AddDocumentsRequest):
    """Add documents to a collection"""
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        if not request.documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        # Determine which embedding provider/model to use
        # Priority: API request > collection metadata > defaults from .env
        collection_metadata = collection.metadata or {}
        provider = (
            request.embedding_provider or 
            collection_metadata.get("embedding_provider") or 
            EMBEDDING_PROVIDER
        )
        model = (
            request.embedding_model or 
            collection_metadata.get("embedding_model") or 
            embedding_config.get("model")
        )
        
        print(f"📝 Processing {len(request.documents)} documents for collection {collection_name}...")
        print(f"   📐 Using embeddings: {provider}/{model}")
        
        # Prepare data
        texts = []
        metadatas = []
        ids = []
        embeddings = []
        
        # Process each document
        for i, doc in enumerate(request.documents):
            text = doc.get('text', '')
            if not text:
                continue
                
            texts.append(text)
            
            # Prepare metadata
            doc_metadata = doc.get('metadata', {})
            doc_metadata['text'] = text  # Store text in metadata too
            metadatas.append(doc_metadata)
            
            # Use provided ID or generate one
            doc_id = doc.get('id') or f"doc_{uuid.uuid4()}"
            ids.append(doc_id)
            
            # Generate embedding using collection's provider/model
            print(f"  🔄 Generating embedding for document {i+1}/{len(request.documents)}...")
            embedding = generate_embedding(text, provider=provider, model=model)
            embeddings.append(embedding)
        
        if not texts:
            raise HTTPException(status_code=400, detail="No valid documents with text provided")
        
        # Add to ChromaDB
        collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings
        )
        
        print(f"✅ Successfully added {len(texts)} documents to {collection_name}")
        
        return {
            "status": "added",
            "collection": collection_name,
            "count": len(texts),
            "ids": ids
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR adding documents to {collection_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collections/{collection_name}/documents")
def delete_documents(collection_name: str, ids: List[str]):
    """Delete documents from a collection"""
    try:
        collection = chroma_client.get_collection(name=collection_name)
        collection.delete(ids=ids)
        
        print(f"🗑️ Deleted {len(ids)} documents from {collection_name}")
        return {
            "status": "deleted",
            "collection": collection_name,
            "count": len(ids)
        }
    except Exception as e:
        print(f"❌ ERROR deleting documents from {collection_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Query endpoint
@app.post("/query")
def query_db(request: QueryRequest):
    """Query a collection"""
    print(f"🔍 Received query: {request.query}")
    
    try:
        # Get collection (must be specified)
        if not request.collection:
            raise HTTPException(
                status_code=400,
                detail="Collection name is required"
            )
        
        collection_name = request.collection
        
        try:
            collection = chroma_client.get_collection(name=collection_name)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found"
            )
        
        # Get embedding provider/model from collection metadata (or use defaults)
        collection_metadata = collection.metadata or {}
        embedding_provider = collection_metadata.get("embedding_provider", EMBEDDING_PROVIDER)
        embedding_model = collection_metadata.get("embedding_model", embedding_config.get("model"))
        
        print(f"   📐 Using embeddings: {embedding_provider}/{embedding_model}")
        
        # Convert user query to embedding using collection's provider/model
        query_embedding = generate_embedding(request.query, provider=embedding_provider, model=embedding_model)

        # Search ChromaDB with distances included
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.top_k,
            include=["metadatas", "distances"]
        )

        # Debugging: Print raw ChromaDB response
        print(f"📊 Raw ChromaDB Response: {results}")

        # Ensure results exist
        if not results or "metadatas" not in results or not results["metadatas"]:
            print("⚠️ No relevant results found in ChromaDB.")
            return {"results": [], "message": "No relevant data found."}

        # ✅ Return metadata + distance for each result
        retrieved_results = []
        for i, match in enumerate(results["metadatas"][0]):
            distance = results["distances"][0][i]  # Get distance score

            if match and "text" in match:
                retrieved_results.append({
                    "text": match["text"],
                    "distance": distance,
                    "metadata": match
                })

        return {
            "results": retrieved_results,
            "collection_metadata": collection_metadata
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: Failed to process query '{request.query}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Run the server (if executed directly)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5006)

