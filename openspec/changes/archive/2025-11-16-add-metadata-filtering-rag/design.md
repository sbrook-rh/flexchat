# Design Notes

## Low-Level API Philosophy

The `GET /collections/{name}/documents` endpoint is intentionally designed as a **low-level pass-through** to ChromaDB's metadata filtering capabilities.

### Why Pass-Through?

1. **Simplicity**: No duplication of ChromaDB's filter validation logic
2. **Completeness**: Exposes full ChromaDB query capabilities without artificial limitations
3. **Maintenance**: Always in sync with ChromaDB - no need to update wrapper when ChromaDB adds features
4. **Transparency**: Error messages come directly from ChromaDB (clear source of truth)

### Design Decision: Primitive vs. Ergonomic

**What we provide:**
- Raw ChromaDB filter syntax (JSON string)
- Direct pass-through to `collection.get(where=...)`
- Validation: JSON parsing only (400 if invalid JSON)

**What we DON'T provide:**
- Simplified filter syntax
- Automatic translation of implicit AND
- Client-friendly abstractions

### Recommended Abstraction Layer

Clients should build helper methods or extend provider classes to convert ergonomic syntax into ChromaDB filters:

```javascript
// Helper function example (Node.js client)
function buildFilter(conditions) {
  const keys = Object.keys(conditions);
  
  // Handle semantic suffixes
  const chromaFilters = keys.map(key => {
    if (key.endsWith('_in')) {
      const field = key.replace('_in', '');
      return { [field]: { $in: conditions[key] } };
    }
    if (key.endsWith('_ne')) {
      const field = key.replace('_ne', '');
      return { [field]: { $ne: conditions[key] } };
    }
    // Simple equality
    return { [key]: conditions[key] };
  });
  
  // Multiple conditions require explicit $and
  if (chromaFilters.length > 1) {
    return { $and: chromaFilters };
  }
  
  return chromaFilters[0];
}

// Usage
const simple = buildFilter({ section_id: "intro" });
// → {"section_id": "intro"}

const complex = buildFilter({ 
  chapter_id: "1", 
  doc_type_in: ["heading", "paragraph"] 
});
// → {"$and": [{"chapter_id": "1"}, {"doc_type": {"$in": ["heading", "paragraph"]}}]}
```

### ChromaDB Syntax Constraints

**Multiple conditions:**
```javascript
// ❌ INVALID (implicit AND not supported)
{"chapter": "1", "doc_type": "paragraph"}

// ✅ VALID (explicit $and required)
{"$and": [{"chapter": "1"}, {"doc_type": "paragraph"}]}
```

**Operators:**
- `$and` - Logical AND
- `$or` - Logical OR  
- `$in` - List membership
- `$ne` - Not equal
- `$gt`, `$gte`, `$lt`, `$lte` - Numeric comparison

### Benefits of This Approach

1. **Backend stays simple** - 60 lines, no complex validation logic
2. **Clients get full power** - Can use any ChromaDB feature
3. **Clear responsibility** - Client builds filters, ChromaDB validates syntax
4. **Extensible** - Add helper libraries without backend changes

### Error Handling

Errors propagate directly from ChromaDB with clear messages:

```json
{
  "detail": "Expected where to have exactly one operator, got {'a': 'b', 'c': 'd'}"
}
```

Clients can catch these and provide user-friendly translations if needed.

## Testing Strategy

Tests validate the **pass-through behavior** rather than specific filter syntax:
- ✅ Valid JSON is accepted
- ✅ Invalid JSON returns 400
- ✅ ChromaDB errors propagate with detail
- ✅ Successful queries return correct format

We do NOT test all ChromaDB filter operators - that's ChromaDB's responsibility.

