# FlexChat Vision

This document describes the motivation, design philosophy, and long-term direction of FlexChat. For getting started and technical reference, see the [main README](../README.md). For system architecture and the 6-phase flow, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Background

FlexChat began as an attempt to answer a simple but persistent frustration: most chatbots and “agentic AI” systems feel opaque. They work, sometimes impressively, but it is rarely clear how they are assembled, where their behaviour comes from, or which parts of the system are responsible for success or failure.

Rather than treating this as a black box, FlexChat started as a personal effort to understand the engineering behind modern AI-assisted systems: model integration, retrieval, memory, orchestration, evaluation, and tooling.

Early experiments with system prompts, Gemini Gems, and similar features made it clear that prompting alone was not enough. Once you care about grounding, domain knowledge, cost, or reliability, you are forced to think in terms of systems, not chats.

---

## Dual Purpose: Learning and Building

FlexChat was designed with two parallel goals:

1. **To use AI to help build AI systems**
   The project has been developed using tools such as Cursor and Claude Code, treating agentic assistance as part of the development process.

2. **To build the system from the ground up**
   Each major component—model integration, RAG, memory, tool calling—has been implemented explicitly, to understand how they interact and where their limits are.

This combination reflects a belief that effective use of AI requires understanding its constraints, not just its outputs.

---

## Small Models, Cost, and Sovereignty

A central design concern is the over-reliance on very large hosted models.

While systems like ChatGPT are impressive, they raise several issues:

* Cost and long-term sustainability
* Data sovereignty and regulatory risk
* Security for company-specific data
* Environmental impact and energy usage

FlexChat is intentionally biased toward exploring what can be achieved with smaller, locally-hosted models. The goal is not to reject large models, but to avoid making them a default dependency.

If AI is to be broadly useful and socially sustainable, we need to learn how to extract value from constrained systems.

---

## Early Architecture: Models and Memory

The first functional milestone was a minimal chatbot:

* A React-based interface for live, inspectable interactions
* Adapter-based integration with model providers (initially Ollama, then OpenAI and Gemini)
* A simple rolling message history (initially full-chain, later limited to recent turns)

Providers are abstracted through adapters. Adding a new provider requires implementing a small, well-defined interface rather than restructuring the system.

More advanced memory strategies (summarisation, condensation, long-term memory) are recognised as important but remain future work.

---

## RAG as a First-Class Concern

When experimenting with small models, hallucination and fabrication became immediately visible.

The main cause was not model quality alone, but weak retrieval.

FlexChat therefore treats retrieval as core infrastructure rather than an add-on.

Key design choices:

* RAG providers are abstracted through adapters
* ChromaDB is currently supported via a bespoke wrapper
* Users can manage collections and data from within the interface
* Other backends (pgvector, Milvus, etc.) are intended to be swappable

The bespoke wrapper exists to give users operational control, not just query access.

---

## Topic Awareness and Context Preservation

Early testing revealed a common failure mode: loss of conversational context.

Example:

> “What is RBAC?”
> “How do I apply that using ACM?”

Without context, the second query is ambiguous.

FlexChat introduced topic detection and continuation as core primitives. These maintain conversational continuity and significantly improve retrieval relevance, especially for small models.

This feature alone produced a large quality improvement.

---

## Structured and Hierarchical Retrieval

As the system began to ingest larger corpora—particularly Red Hat product documentation—it became clear that chunking alone was insufficient.

High-quality answers depend on how information is stored and navigated.

Experiments showed that:

* Structured, hierarchical storage
* Multi-phase retrieval
* Progressive narrowing

outperform naive vector search for technical documentation.

Multi-stage retrieval is not yet fully implemented in FlexChat, but experimentation strongly supports this direction.

---

## Tool Calling and Capability Testing

FlexChat also serves as a testbed for model capabilities.

Built-in tools include:

* Current date retrieval
* UUID generation
* Additional diagnostic utilities

The interface allows users to:

* Select provider and model
* Issue tool-eligible queries
* Observe whether tool calls occur
* Execute tools automatically
* Record which model/provider pairs succeed

Results are stored locally to build an empirical capability profile.

This reflects a broader goal: understanding what models can reliably do, rather than assuming feature parity.

---

## Design Principles

FlexChat is guided by a small set of informal principles:

* **Transparency over magic**
  System behaviour should be inspectable and understandable.

* **Structure over prompt accumulation**
  Reliability comes from workflow design, not increasingly long prompts.

* **Adapters over lock-in**
  Providers and backends should be replaceable.

* **Evidence over assumptions**
  Capabilities are tested and recorded, not inferred from marketing.

* **Learning over convenience**
  The system should teach its users how it works.

---

## What FlexChat Is (and Is Not)

FlexChat is:

* A framework for exploring AI systems as infrastructure
* A sandbox for RAG, tool calling, and orchestration
* A learning platform for understanding LLM integration

FlexChat is not:

* A turnkey commercial chatbot
* A fully-managed enterprise platform
* A replacement for large hosted systems

It prioritises insight and control over polish.

---

## Intended Audience

FlexChat is primarily for:

* Engineers exploring AI integration
* Architects interested in inspectable systems
* Practitioners working with constrained environments
* Anyone who prefers understanding over abstraction

It is probably not ideal for users who want a “just works” black-box assistant.

---

## Direction of Travel

Current and likely future work includes:

* Multi-phase hierarchical retrieval
* Improved memory management
* Policy-driven orchestration
* MCP-based integrations
* Stronger validation and grounding checks
* Expanded evaluation tooling

The emphasis remains on building composable, auditable systems rather than increasingly agentic monoliths.

---

## Closing

FlexChat reflects the view that AI systems are becoming part of core infrastructure. As such, they deserve the same level of engineering discipline, transparency, and critical thinking as any other major platform.

This project exists to make those moving parts visible—and to learn, experimentally, how they fit together.
