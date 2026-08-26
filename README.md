# DocuMind AI

> Production-ready AI document intelligence platform using Retrieval-Augmented Generation (RAG), Qdrant, Ollama, FastAPI, and React.

DocuMind AI allows users to upload documents and ask natural-language questions about their content.

The system retrieves relevant document chunks from a vector database and uses a Large Language Model to generate answers grounded in the uploaded documents.

---

## 🚀 Project Overview

DocuMind AI is an end-to-end RAG application designed to provide reliable question answering over uploaded documents.

Instead of sending an entire document directly to an LLM, the application:

1. Loads the uploaded document.
2. Extracts its text.
3. Splits the text into smaller chunks.
4. Generates vector embeddings.
5. Stores the embeddings in Qdrant.
6. Converts the user's question into an embedding.
7. Retrieves the most relevant document chunks.
8. Sends the retrieved context to the LLM.
9. Generates a grounded answer.
10. Displays the answer together with source information.

---

## 🧠 Architecture

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │      Vite           │
                         └──────────┬──────────┘
                                    │
                              HTTP / REST
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   FastAPI Backend   │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
             ┌────────────┐  ┌────────────┐  ┌────────────┐
             │   Qdrant   │  │ PostgreSQL │  │   Ollama   │
             │ Vector DB  │  │  Database  │  │    LLM     │
             └────────────┘  └────────────┘  └────────────┘
                    │                              │
                    │                              │
                    ▼                              ▼
             Semantic Search                 Answer Generation
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                            Grounded Answer
                                   │
                                   ▼
                              React UI


Document Upload
      │
      ▼
PDF / Text Extraction
      │
      ▼
Text Chunking
      │
      ▼
Embedding Generation
      │
      ▼
Qdrant Vector Database
      │
      │
User Question
      │
      ▼
Question Embedding
      │
      ▼
Semantic Retrieval
      │
      ▼
Relevant Document Chunks
      │
      ▼
LLM Context Construction
      │
      ▼
Ollama / LLM
      │
      ▼
Grounded Answer



## ✨ Features
Document Management
Upload PDF documents
Store document chunks
Track document metadata
List uploaded documents
Delete documents
Document-specific search
RAG Question Answering
Semantic vector search
Document-specific retrieval
Multi-document search
Context-aware answer generation
Source metadata returned with answers
Prevents unsupported answers when information is unavailable
AI Capabilities
Retrieval-Augmented Generation
LLM-based question answering
Local LLM inference using Ollama
Local embedding generation
Semantic similarity search
Backend
FastAPI REST API
Qdrant vector database
PostgreSQL
Docker
Health monitoring
Frontend
React
Vite
Tailwind CSS
Axios
Lucide React
Interactive AI workspace
Document management interface
Source display

## 🛠️ Technology Stack
Category	Technology
Frontend	React, Vite
Styling	Tailwind CSS
Backend	FastAPI
Programming Language	Python
Vector Database	Qdrant
Relational Database	PostgreSQL
LLM Runtime	Ollama
LLM	Qwen3 4B
Embedding Model	nomic-embed-text
Containerization	Docker
API Client	Axios
Version Control	Git / GitHub
