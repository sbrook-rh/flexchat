# Flex Chat - TODO List (Simplified)

## 📋 About This Document

This document tracks **new ideas and ideas in progress**. For detailed implementation plans, see files referenced in parentheses

---

## 🆕 New Ideas

### UI/UX Improvements
- [ ] **Topic Interaction** (topic-interaction)
  - [ ] Edit previous message topics
  - [ ] Resubmit with new topic
  - [ ] Topic change visualization
  - [ ] Topic history

- [ ] **Chat History** (chat-history)
  - [ ] Export conversations
  - [ ] Search history
  - [ ] Conversation branching

- [ ] **UI Polish** (ui-polish)
  - [ ] Improve error messages
  - [ ] Add loading states
  - [ ] Better mobile responsiveness
  - [ ] Dark mode toggle
  - [ ] Customizable themes

### Advanced Features
- [ ] **Toolbox & Workspace System** (toolbox-workspace)
  - [ ] Tool selection interface
  - [ ] Workspace management
  - [ ] Tool configuration

- [ ] **Advanced Streaming** (advanced-streaming)
  - [ ] Real-time typing indicators
  - [ ] Partial response handling
  - [ ] Stream interruption

### Advanced Capabilities
- [ ] **Provider Implementations** (provider-implementations)
  - [ ] Anthropic Claude provider
  - [ ] Milvus RAG provider
  - [ ] Provider health monitoring

- [ ] **Advanced RAG Features** (advanced-rag-features)
  - [ ] Provider data structure specialization
  - [ ] Enhanced document ingestion
  - [ ] Query enhancement
  - [ ] RAG caching
  - [ ] Multi-collection queries

- [ ] **Maintenance & Operations** (maintenance-operations)
  - [ ] Documentation updates
  - [ ] Dependency updates
  - [ ] Performance monitoring
  - [ ] Security updates

---

## 📋 Planning

### Provider Work
- [ ] **Add Gemini Provider** (add-gemini-provider)
  - [ ] Implement GeminiProvider class
  - [ ] Add to provider registry
  - [ ] Test with real API
  - [ ] Validate response quality

### Testing & Validation
- [ ] **Automated Testing** (automated-testing)
  - [ ] Unit tests for all modules
  - [ ] Integration tests for full flow
  - [ ] Error scenario testing

- [ ] **Performance Testing** (performance-testing)
  - [ ] Concurrent requests
  - [ ] Large document uploads
  - [ ] Query performance with large collections

- [ ] **Configuration Viewer & Management UI** (config-viewer)
  - [ ] Display current config in UI
  - [ ] Test connections
  - [ ] Future: Live editing

- [ ] **Streaming Responses** (streaming-responses)
  - [ ] Server-Sent Events for real-time responses
  - [ ] "Thinking" phase for reasoning models
  - [ ] Better UX for long responses

### RAG Enhancements
- [ ] **RAG Source Attribution** (rag-source-attribution)
  - [ ] Add collection info to `{{rag_context}}`
  - [ ] Format: `From collection "Soup recipes from around the world":`

- [ ] **Per-Message Model Switching** (per-message-model-switching)
  - [ ] Try different models on existing responses
  - [ ] Re-query RAG with stored topic
  - [ ] UI: "Try with different model" button

- [ ] **Configuration Presets** (config-presets)
  - [ ] Save/load named configurations
  - [ ] Share presets between team members
  - [ ] Quick switching between setups

### Core Features
- [ ] **Connection Builder Interface** (connection-builder)
  - [ ] Complete 949-line specification documented
  - [ ] All user flows and API endpoints designed
  - [ ] Security model thoroughly documented
  - [ ] Phase 1: Core Infrastructure
  - [ ] Phase 2: Enhanced UX - Model discovery, env var dropdown, name clash detection
  - [ ] Phase 3: Advanced Features - Health monitoring, batch setup, templates

---

### Documentation
- Architecture: `docs/ARCHITECTURE.md`
- Configuration: `docs/CONFIGURATION.md`
- RAG Services: `docs/RAG_SERVICES.md`
- Connection Builder: `docs/CONNECTION_BUILDER.md`

---
