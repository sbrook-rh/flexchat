from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import requests
import argparse
import json

# Load environment variables
load_dotenv()

# Parse command-line arguments
parser = argparse.ArgumentParser(description='ChromaDB Wrapper Service')
parser.add_argument('--chroma-path', type=str, default='./chroma_db',
                    help='Path to ChromaDB storage directory (default: ./chroma_db)')
parser.add_argument('--port', type=int, default=5006,
                    help='Server port (default: 5006)')
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

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    collection: Optional[str] = None  # Allow dynamic collection selection
    query_embedding: List[float]  # Pre-computed embedding vector

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
    """Add documents to a collection with pre-computed embeddings"""
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        if not request.documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        print(f"📝 Processing {len(request.documents)} documents for collection {collection_name} (pre-computed embeddings required)...")
        
        # Prepare data
        texts = []
        metadatas = []
        ids = []
        embeddings = []
        dims = None
        
        # Process each document
        for i, doc in enumerate(request.documents):
            text = doc.get('text', '')
            if not text:
                continue
            emb = doc.get('embedding')
            if emb is None:
                raise HTTPException(
                    status_code=400,
                    detail="All documents must include pre-computed embeddings"
                )
            if not isinstance(emb, list) or not all(isinstance(x, (int, float)) for x in emb):
                raise HTTPException(
                    status_code=400,
                    detail="Embedding must be an array of numbers"
                )
            if dims is None:
                dims = len(emb)
            elif len(emb) != dims:
                raise HTTPException(
                    status_code=400,
                    detail="All embeddings in a single request must have the same dimensions"
                )
            
            texts.append(text)
            metadatas.append(doc.get('metadata', {}))
            ids.append(doc.get('id') or f"doc_{uuid.uuid4()}")
            embeddings.append(emb)
        
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
        
        # Use provided query embedding for similarity search
        query_embedding = request.query_embedding
        
        # Get collection metadata for response
        collection_metadata = collection.metadata or {}

        # Search ChromaDB with distances and documents included
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.top_k,
            include=["metadatas", "distances", "documents"]
        )

        # Debugging: Print raw ChromaDB response
        print(f"📊 Raw ChromaDB Response: {results}")

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


# Run the server (if executed directly)
if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting server on port {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port)

