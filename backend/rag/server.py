from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import os
import sys
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import requests
import argparse
import json
import yaml

# Load environment variables
load_dotenv()

# ============================================================================
# Curated Cross-Encoder Models
# ============================================================================
RECOMMENDED_MODELS = {
    "fast": {
        "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "size": "90MB",
        "latency": "~100ms (10 docs, CPU)",
        "accuracy": "Good",
        "use_case": "Development/Testing"
    },
    "recommended": {
        "name": "BAAI/bge-reranker-base",
        "size": "300MB",
        "latency": "~200ms (10 docs, CPU)",
        "accuracy": "Excellent",
        "use_case": "Production (recommended)"
    },
    "high-accuracy": {
        "name": "BAAI/bge-reranker-large",
        "size": "1.3GB",
        "latency": "~500ms (10 docs, CPU)",
        "accuracy": "Best",
        "use_case": "High-accuracy requirements"
    }
}

# Check for --list-reranker-models before other argument processing
if '--list-reranker-models' in sys.argv:
    print("\n📋 Available Cross-Encoder Reranking Models:\n")
    print("=" * 80)
    
    for tier, info in RECOMMENDED_MODELS.items():
        print(f"\n{info['use_case']}:")
        print(f"  Model: {info['name']}")
        print(f"  Size: {info['size']}  |  Latency: {info['latency']}  |  Accuracy: {info['accuracy']}")
    
    print("\n" + "=" * 80)
    print("\nℹ️  Note: Any HuggingFace cross-encoder model can be used.")
    print("🔗 Browse models: https://huggingface.co/models?pipeline_tag=text-classification&search=cross-encoder")
    print("\nUsage:")
    print("  python server.py --cross-encoder BAAI/bge-reranker-base")
    print("  python server.py --cross-encoder-path /path/to/local/model")
    print()
    exit(0)

# Parse command-line arguments
parser = argparse.ArgumentParser(description='ChromaDB Wrapper Service')
parser.add_argument('--chroma-path', type=str, default='./chroma_db',
                    help='Path to ChromaDB storage directory (default: ./chroma_db)')
parser.add_argument('--port', type=int, default=5006,
                    help='Server port (default: 5006)')
parser.add_argument('--cross-encoder', type=str, default=None,
                    help='Cross-encoder model name from HuggingFace (e.g., BAAI/bge-reranker-base, cross-encoder/ms-marco-MiniLM-L-6-v2)')
parser.add_argument('--cross-encoder-path', type=str, default=None,
                    help='Local path to cross-encoder model (overrides --cross-encoder)')
parser.add_argument('--list-reranker-models', action='store_true',
                    help='List available reranker models and exit')
parser.add_argument('--embeddings-config', type=str, default=None,
                    help='Path to embeddings YAML config file (e.g., embeddings.yml)')
parser.add_argument('--download-models', action='store_true',
                    help='Download embedding models from config and exit without starting server')
args = parser.parse_args()

# ============================================================================
# ChromaDB Storage Service
# ============================================================================
# This service provides HTTP access to ChromaDB for document storage and retrieval.
# All embeddings must be pre-computed and included in requests.

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
print(f"🔄 Connecting to ChromaDB at {args.chroma_path}...")
chroma_client = chromadb.PersistentClient(path=args.chroma_path)
print("✅ ChromaDB initialized.")

# ============================================================================
# Cross-Encoder Model Loading
# ============================================================================
# Global variables for cross-encoder
cross_encoder_model = None
cross_encoder_model_name = None

# Support environment variables as fallback
CROSS_ENCODER_MODEL = os.getenv('CROSS_ENCODER_MODEL', args.cross_encoder)
CROSS_ENCODER_PATH = os.getenv('CROSS_ENCODER_PATH', args.cross_encoder_path)

# Load cross-encoder if specified
if CROSS_ENCODER_PATH:
    from sentence_transformers import CrossEncoder
    print(f"🔄 Loading cross-encoder from path: {CROSS_ENCODER_PATH}")
    try:
        cross_encoder_model = CrossEncoder(CROSS_ENCODER_PATH)
        cross_encoder_model_name = CROSS_ENCODER_PATH
        print(f"✅ Cross-encoder loaded from {CROSS_ENCODER_PATH}")
    except Exception as e:
        print(f"❌ FATAL: Failed to load cross-encoder from {CROSS_ENCODER_PATH}: {e}")
        exit(1)

elif CROSS_ENCODER_MODEL:
    from sentence_transformers import CrossEncoder
    print(f"🔄 Loading cross-encoder model: {CROSS_ENCODER_MODEL}")
    try:
        cross_encoder_model = CrossEncoder(CROSS_ENCODER_MODEL)
        cross_encoder_model_name = CROSS_ENCODER_MODEL
        print(f"✅ Cross-encoder loaded: {CROSS_ENCODER_MODEL}")
    except Exception as e:
        print(f"❌ FATAL: Failed to load cross-encoder {CROSS_ENCODER_MODEL}: {e}")
        exit(1)

else:
    print("ℹ️  Cross-encoder not enabled")
    print("   💡 Enable with: python server.py --cross-encoder BAAI/bge-reranker-base")
    print("   💡 See options: python server.py --list-reranker-models")

# ============================================================================
# Embedding Model Loading
# ============================================================================
# Global variables for embedding models
embedding_models = {}  # Dict[str, dict] - keyed by model ID
embedding_model_configs = []  # List of configs from YAML

# Support environment variable as fallback
EMBEDDINGS_CONFIG = os.getenv('EMBEDDINGS_CONFIG', args.embeddings_config)

# Load embedding models if config provided
if EMBEDDINGS_CONFIG:
    from sentence_transformers import SentenceTransformer
    
    print(f"🔄 Loading embedding models from {EMBEDDINGS_CONFIG}...")
    
    try:
        with open(EMBEDDINGS_CONFIG, 'r') as f:
            config = yaml.safe_load(f)
        
        if not config or 'embeddings' not in config or not config['embeddings']:
            print("❌ FATAL: No embedding models configured")
            print()
            print("   Embedding models are required for document storage and querying.")
            print()
            print("   Create embeddings.yml:")
            print()
            print("   embeddings:")
            print("     - id: mxbai-large")
            print("       path: mixedbread-ai/mxbai-embed-large-v1")
            print()
            print("   Then start with: python server.py --embeddings-config embeddings.yml")
            print()
            sys.exit(1)
        
        embedding_model_configs = config['embeddings']
        
        # Validate config structure
        seen_ids = set()
        for model_config in embedding_model_configs:
            if 'id' not in model_config or 'path' not in model_config:
                print(f"❌ FATAL: Invalid model config - must have 'id' and 'path' fields: {model_config}")
                sys.exit(1)
            
            model_id = model_config['id']
            if model_id in seen_ids:
                print(f"❌ FATAL: Duplicate model ID '{model_id}' in config")
                sys.exit(1)
            seen_ids.add(model_id)
        
        # Load each model
        for model_config in embedding_model_configs:
            model_id = model_config['id']
            model_path = model_config['path']
            
            print(f"🔄 Loading embedding model: {model_id} ({model_path})...")
            
            try:
                # Some models require trust_remote_code for custom code execution
                model = SentenceTransformer(model_path, trust_remote_code=True)
                dimensions = model.get_sentence_embedding_dimension()
                
                embedding_models[model_id] = {
                    'model': model,
                    'name': model_path,
                    'dimensions': dimensions
                }
                
                print(f"✅ Loaded: {model_id} ({dimensions} dimensions)")
            except Exception as e:
                print(f"❌ FATAL: Failed to load embedding model {model_id} ({model_path}): {e}")
                sys.exit(1)
        
        print(f"✅ {len(embedding_models)} embedding model(s) loaded successfully")
        
        # If --download-models flag set, exit after loading
        if args.download_models:
            print()
            print("✅ Model download complete. Models cached for future runs.")
            print("   Start server with: python server.py --embeddings-config embeddings.yml")
            print()
            sys.exit(0)
    
    except FileNotFoundError:
        print(f"❌ FATAL: Embeddings config file not found: {EMBEDDINGS_CONFIG}")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"❌ FATAL: Invalid YAML in {EMBEDDINGS_CONFIG}: {e}")
        sys.exit(1)

else:
    print("❌ FATAL: No embeddings config specified")
    print()
    print("   Embedding models are required for document storage and querying.")
    print()
    print("   Create embeddings.yml and start with:")
    print("   python server.py --embeddings-config embeddings.yml")
    print()
    print("   Or set environment variable:")
    print("   EMBEDDINGS_CONFIG=embeddings.yml python server.py")
    print()
    sys.exit(1)

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    collection: Optional[str] = None  # Allow dynamic collection selection
    where: Optional[Dict[str, Any]] = None  # Metadata filter (ChromaDB syntax)

class CreateCollectionRequest(BaseModel):
    name: str
    metadata: Optional[Dict[str, Any]] = {}
    embedding_model: Optional[str] = None  # Model ID from loaded models (validated)

class AddDocumentsRequest(BaseModel):
    documents: List[Dict[str, Any]]  # Each doc: {text: str, metadata?: dict, id?: str}

class UpdateCollectionMetadataRequest(BaseModel):
    metadata: Dict[str, Any]

class RerankRequest(BaseModel):
    query: str
    documents: List[Dict[str, str]]  # Each: {id: str, text: str}
    top_k: Optional[int] = None

# ============================================================================
# Helper Functions
# ============================================================================

def get_embedding_model_for_collection(collection):
    """
    Retrieve the embedding model to use for a collection.
    
    Args:
        collection: ChromaDB collection object
        
    Returns:
        SentenceTransformer model instance
        
    Raises:
        HTTPException: If model not found or not loaded
    """
    metadata = collection.metadata or {}
    model_id = metadata.get('embedding_model')
    
    if not model_id:
        available = list(embedding_models.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Collection '{collection.name}' has no embedding_model in metadata. "
                   f"This may be an older collection. Please update metadata with one of: {available}"
        )
    
    if model_id not in embedding_models:
        available = list(embedding_models.keys())
        raise HTTPException(
            status_code=503,
            detail=f"Embedding model '{model_id}' not loaded. Available models: {available}"
        )
    
    return embedding_models[model_id]['model']

# ============================================================================
# API Endpoints
# ============================================================================

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
        response = {
            "status": "healthy",
            "collections_count": len(collections)
        }
        
        # Add embedding models status if loaded
        if embedding_models:
            response["embedding_models"] = [
                {
                    "id": model_id,
                    "name": model_info['name'],
                    "status": "loaded",
                    "dimensions": model_info['dimensions']
                }
                for model_id, model_info in embedding_models.items()
            ]
        
        # Add cross-encoder status if loaded
        if cross_encoder_model:
            response["cross_encoder"] = {
                "model": cross_encoder_model_name,
                "status": "loaded"
            }
        
        return response
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
        
        # Validate embedding_model
        if not request.embedding_model:
            available = list(embedding_models.keys())
            raise HTTPException(
                status_code=400,
                detail=f"embedding_model is required. Available models: {available}"
            )
        
        if request.embedding_model not in embedding_models:
            available = list(embedding_models.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.embedding_model}' not loaded. Available models: {available}"
            )
        
        # Store embedding model in metadata
        collection_metadata = request.metadata or {}
        collection_metadata["embedding_model"] = request.embedding_model
        
        # Create collection with cosine distance for normalized embeddings
        collection = chroma_client.create_collection(
            name=request.name,
            metadata={
                **collection_metadata,
                "hnsw:space": "cosine"  # Use cosine distance for text embeddings
            }
        )
        
        print(f"✅ Created collection: {request.name} (embedding model: {request.embedding_model}, distance: cosine)")
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
def update_collection_metadata(
    name: str, 
    request: UpdateCollectionMetadataRequest,
    merge: bool = Query(default=False, description="Merge with existing metadata (default: false for backward compatibility)")
):
    """
    Update collection metadata.
    
    Args:
        name: Collection name
        request: Metadata update request
        merge: If True, merge with existing metadata; if False, replace all metadata (default)
    
    The merge parameter allows partial updates without wiping other fields.
    Default is False to maintain backward compatibility with existing clients.
    """
    try:
        collection = chroma_client.get_collection(name=name)
        
        if merge:
            # Merge mode: preserve existing fields, update/add new ones
            existing_metadata = collection.metadata or {}
            updated_metadata = {**existing_metadata, **request.metadata}
        else:
            # Replace mode (default): full replacement (current behavior)
            updated_metadata = request.metadata
        
        # Use ChromaDB's modify method to update metadata
        collection.modify(metadata=updated_metadata)
        
        print(f"✅ Updated metadata for collection: {name} (merge={merge})")
        return {
            "status": "updated",
            "name": name,
            "metadata": updated_metadata,
            "merge": merge
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
    """Add documents to a collection (embeddings generated internally)"""
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        if not request.documents:
            raise HTTPException(status_code=400, detail="Documents array is required")
        
        # Get embedding model for this collection
        model = get_embedding_model_for_collection(collection)
        
        print(f"📝 Processing {len(request.documents)} documents for collection {collection_name}...")
        
        # Prepare data
        texts = []
        metadatas = []
        ids = []
        
        # Process each document
        for i, doc in enumerate(request.documents):
            text = doc.get('text', '')
            if not text:
                raise HTTPException(
                    status_code=400,
                    detail=f"Document at index {i} missing required 'text' field"
                )
            
            texts.append(text)
            metadatas.append(doc.get('metadata', {}))
            ids.append(doc.get('id') or f"doc_{uuid.uuid4()}")
        
        if not texts:
            raise HTTPException(status_code=400, detail="No valid documents with text provided")
        
        # Generate embeddings using collection's model
        print(f"🔄 Generating embeddings for {len(texts)} documents...")
        embeddings = model.encode(texts, convert_to_numpy=True).tolist()
        
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


@app.delete("/collections/{collection_name}/documents/all")
def empty_collection(collection_name: str):
    """
    Empty a collection by deleting all documents.
    Preserves collection metadata and settings.
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        # Get all document IDs
        results = collection.get(limit=None, include=["documents"])
        all_ids = results.get("ids", [])
        count_deleted = len(all_ids)
        
        # Delete all documents if any exist
        if count_deleted > 0:
            collection.delete(ids=all_ids)
            print(f"🗑️ Emptied collection {collection_name} - deleted {count_deleted} documents")
        else:
            print(f"ℹ️ Collection {collection_name} was already empty")
        
        return {
            "status": "emptied",
            "collection": collection_name,
            "count_deleted": count_deleted
        }
    except ValueError as e:
        # Collection not found
        print(f"❌ Collection not found: {collection_name}")
        raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
    except Exception as e:
        print(f"❌ ERROR emptying collection {collection_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Metadata query endpoint
@app.get("/collections/{collection_name}/documents")
def get_documents(
    collection_name: str,
    where: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """
    Query documents by metadata filters (low-level ChromaDB pass-through).
    
    This is a primitive API that passes filters directly to ChromaDB.
    For production use, consider building helper methods or extending the
    provider class to convert simpler abstractions (e.g., hash with semantic
    keys like "doc_type_in" or "chapter_id_contains") into ChromaDB syntax.
    
    Enables deterministic document retrieval based on metadata attributes,
    useful for sibling gathering (fetching all documents with same section_id).
    
    Args:
        collection_name: Name of the collection to query
        where: JSON string with ChromaDB filter syntax (pass-through)
        limit: Maximum documents to return (default 100, max 1000)
        offset: Number of documents to skip (default 0)
    
    Returns:
        {
            "documents": [{"id": str, "text": str, "metadata": dict}, ...],
            "count": int,
            "total": int
        }
    
    ChromaDB Filter Syntax (multiple conditions require explicit operators):
        Simple equality:    ?where={"section_id":"intro"}
        Explicit $and:      ?where={"$and":[{"product":"X"},{"doc_type":"paragraph"}]}
        Logical $or:        ?where={"$or":[{"chapter":"1"},{"chapter":"3"}]}
        List membership:    ?where={"doc_type":{"$in":["heading","paragraph"]}}
        Not equal:          ?where={"status":{"$ne":"deprecated"}}
    
    Note: Implicit AND (multiple keys) is NOT supported by ChromaDB.
    Filter validation and error messages come directly from ChromaDB.
    
    Recommended abstraction layer (implement in client/provider):
        {"doc_type_in": ["heading", "paragraph"]} 
          → {"doc_type": {"$in": ["heading", "paragraph"]}}
        
        {"chapter_id": "1", "doc_type": "paragraph"}
          → {"$and": [{"chapter_id": "1"}, {"doc_type": "paragraph"}]}
    """
    try:
        # Get collection
        collection = chroma_client.get_collection(name=collection_name)
        
        # Parse where filter
        where_filter = None
        if where:
            try:
                where_filter = json.loads(where)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid 'where' filter: must be valid JSON. {str(e)}"
                )
        
        # Query ChromaDB using metadata-based get() method
        results = collection.get(
            where=where_filter,
            limit=limit,
            offset=offset,
            include=["documents", "metadatas"]
        )
        
        # Format response
        documents = []
        ids = results.get("ids", [])
        texts = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        
        for i in range(len(ids)):
            documents.append({
                "id": ids[i],
                "text": texts[i] if i < len(texts) else "",
                "metadata": metadatas[i] if i < len(metadatas) else {}
            })
        
        return {
            "documents": documents,
            "count": len(documents),
            "total": len(documents)  # ChromaDB get() doesn't provide separate total
        }
        
    except HTTPException:
        raise  # Pass through HTTP exceptions
    except Exception as e:
        print(f"❌ ERROR querying documents from {collection_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Metadata field values endpoint  
@app.get("/collections/{collection_name}/metadata-values")
def get_metadata_values(
    collection_name: str,
    field: str = Query(..., description="Metadata field name")
):
    """
    Get unique values for a metadata field across all documents in a collection.
    
    Used to populate categorical filter dropdowns in UI. Returns actual values
    from document metadata, not manually configured lists.
    
    Args:
        collection_name: Name of the collection to query
        field: Metadata field name to get values for
    
    Returns:
        {
            "field": str,
            "values": list[str],  # Unique values, sorted alphabetically
            "count": int           # Number of unique values
        }
    
    Example:
        GET /collections/fancy-desserts/metadata-values?field=region
        → {"field": "region", "values": ["British Classics", "French Pastries"], "count": 2}
    """
    try:
        # Get collection
        collection = chroma_client.get_collection(name=collection_name)
        
        # Query all documents (no filter) to get metadata
        results = collection.get(
            include=["metadatas"],
            limit=None  # Get all documents
        )
        
        # Extract unique values for the specified field
        values_set = set()
        metadatas = results.get("metadatas", [])
        
        for metadata in metadatas:
            if metadata and field in metadata:
                value = metadata[field]
                # Convert to string to ensure consistency
                if value is not None:
                    values_set.add(str(value))
        
        # Sort values alphabetically for consistent display
        unique_values = sorted(list(values_set))
        
        return {
            "field": field,
            "values": unique_values,
            "count": len(unique_values)
        }
        
    except HTTPException:
        raise  # Pass through HTTP exceptions
    except Exception as e:
        print(f"❌ ERROR getting metadata values for {collection_name}.{field}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Query endpoint
@app.post("/query")
def query_db(request: QueryRequest):
    """Query a collection"""
    print(f"🔍 Received query: {request.query}")
    print(f"   📦 Collection: {request.collection}")
    print(f"   🔢 Top K: {request.top_k}")
    print(f"   📋 Full request: {request}")
    
    try:
        # Get collection (must be specified)
        if not request.collection:
            print(f"   ❌ ERROR: No collection specified in request")
            raise HTTPException(
                status_code=400,
                detail="Collection name is required"
            )
        
        collection_name = request.collection
        
        print(f"   🔍 Looking for collection: '{collection_name}'")
        
        try:
            collection = chroma_client.get_collection(name=collection_name)
            print(f"   ✅ Collection found: {collection.name}")
        except Exception as e:
            print(f"   ❌ ERROR: Collection '{collection_name}' not found")
            print(f"   ℹ️  Available collections: {[c.name for c in chroma_client.list_collections()]}")
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found"
            )
        
        # Get embedding model for this collection
        model = get_embedding_model_for_collection(collection)
        
        # Generate query embedding
        print(f"   🔄 Generating query embedding...")
        query_embedding = model.encode([request.query], convert_to_numpy=True).tolist()[0]
        
        # Get collection metadata for response
        collection_metadata = collection.metadata or {}

        # Search ChromaDB with distances and documents included
        # Optional metadata filtering via 'where' parameter
        query_params = {
            "query_embeddings": [query_embedding],
            "n_results": request.top_k,
            "include": ["metadatas", "distances", "documents"]
        }
        
        # Add metadata filter if provided
        if request.where:
            query_params["where"] = request.where
            print(f"   🔍 Applying metadata filter: {request.where}")
        
        results = collection.query(**query_params)

        # Raw ChromaDB response available for debugging if needed
        # print(f"📊 Raw ChromaDB Response: {results}")

        # Ensure results exist
        if not results or "metadatas" not in results or not results["metadatas"]:
            print("⚠️ No relevant results found in ChromaDB.")
            return {"results": [], "message": "No relevant data found."}

        # ✅ Return documents + metadata + distance for each result
        retrieved_results = []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        
        for i in range(len(metadatas)):
            retrieved_results.append({
                "text": documents[i] if i < len(documents) else "",
                "distance": distances[i] if i < len(distances) else 1.0,
                "metadata": metadatas[i] if i < len(metadatas) else {}
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


# Rerank endpoint
@app.post("/rerank")
def rerank_documents(request: RerankRequest):
    """
    Rerank documents using cross-encoder model.
    
    Requires cross-encoder to be loaded at startup.
    Returns documents scored and reordered by relevance.
    """
    if not cross_encoder_model:
        raise HTTPException(
            status_code=503,
            detail="Cross-encoder not loaded. Start server with --cross-encoder flag."
        )
    
    try:
        # Prepare query-document pairs
        pairs = [[request.query, doc["text"]] for doc in request.documents]
        
        # Score all pairs
        scores = cross_encoder_model.predict(pairs)
        
        # Combine documents with scores
        scored_docs = [
            {
                "id": doc["id"],
                "score": float(scores[i]),
                "original_rank": i + 1
            }
            for i, doc in enumerate(request.documents)
        ]
        
        # Sort by score (descending)
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        
        # Apply top_k if specified
        if request.top_k:
            scored_docs = scored_docs[:request.top_k]
        
        return {"reranked": scored_docs}
    
    except Exception as e:
        print(f"❌ ERROR during reranking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Run the server (if executed directly)
if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting server on port {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port)

