import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  queryDocument,
  getDocuments,
} from "../services/api";


function AIWorkspace() {

  // ============================================================
  // CHAT STATE
  // ============================================================

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [expandedSources, setExpandedSources] =
    useState({});

  const [copiedMessage, setCopiedMessage] =
    useState(null);


  // ============================================================
  // DOCUMENT STATE
  // ============================================================

  const [documents, setDocuments] =
    useState([]);

  const [selectedDocument, setSelectedDocument] =
    useState(null);

  const [documentsLoading, setDocumentsLoading] =
    useState(true);


  // ============================================================
  // REFS
  // ============================================================

  const messagesEndRef =
    useRef(null);

  const textareaRef =
    useRef(null);


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages, loading]);


  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

  useEffect(() => {

    const loadDocuments = async () => {

      try {

        setDocumentsLoading(true);

        const data = await getDocuments();

        if (Array.isArray(data)) {

          setDocuments(data);

        } else {

          setDocuments([]);

        }

      } catch (error) {

        console.error(
          "Unable to load documents:",
          error
        );

        setDocuments([]);

      } finally {

        setDocumentsLoading(false);

      }

    };


    loadDocuments();

  }, []);


  // ============================================================
  // ASK QUESTION
  // ============================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    const trimmedQuestion =
      question.trim();


    if (
      !trimmedQuestion ||
      loading
    ) {

      return;

    }


    // ----------------------------------------------------------
    // USER MESSAGE
    // ----------------------------------------------------------

    const userMessage = {

      id: Date.now(),

      role: "user",

      content: trimmedQuestion,

      filename: selectedDocument,

    };


    setMessages((previous) => [

      ...previous,

      userMessage,

    ]);


    setQuestion("");

    setLoading(true);


    try {

      // --------------------------------------------------------
      // QUERY FASTAPI RAG API
      // --------------------------------------------------------

      const response =
        await queryDocument(
          trimmedQuestion,
          selectedDocument
        );


      // --------------------------------------------------------
      // AI RESPONSE
      // --------------------------------------------------------

      const assistantMessage = {

        id: Date.now() + 1,

        role: "assistant",

        content:
          response?.answer ||
          "I couldn't generate an answer.",

        sources:
          Array.isArray(
            response?.sources
          )
            ? response.sources
            : [],

        filename: selectedDocument,

      };


      setMessages((previous) => [

        ...previous,

        assistantMessage,

      ]);

    } catch (error) {

      console.error(
        "DocuMind query failed:",
        error
      );


      const errorMessage = {

        id: Date.now() + 1,

        role: "assistant",

        error: true,

        content:
          "I couldn't connect to the DocuMind AI backend. Please make sure FastAPI and Ollama are running.",

        sources: [],

        filename: selectedDocument,

      };


      setMessages((previous) => [

        ...previous,

        errorMessage,

      ]);

    } finally {

      setLoading(false);

    }

  };


  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      handleSubmit(event);

    }

  };


  // ============================================================
  // CLEAR CHAT
  // ============================================================

  const clearConversation = () => {

    setMessages([]);

    setExpandedSources({});

    setCopiedMessage(null);

  };


  // ============================================================
  // SUGGESTED QUESTIONS
  // ============================================================

  const suggestions = [

    "What certifications does Vishnu have?",

    "What projects has Vishnu worked on?",

    "What technologies does Vishnu know?",

    "What is Vishnu's education?",

  ];


  const useSuggestion = (suggestion) => {

    setQuestion(suggestion);

    textareaRef.current?.focus();

  };


  // ============================================================
  // TOGGLE SOURCES
  // ============================================================

  const toggleSources = (messageId) => {

    setExpandedSources((previous) => ({

      ...previous,

      [messageId]:
        !previous[messageId],

    }));

  };


  // ============================================================
  // COPY ANSWER
  // ============================================================

  const copyAnswer = async (
    messageId,
    content
  ) => {

    try {

      await navigator.clipboard.writeText(
        content
      );

      setCopiedMessage(messageId);

      setTimeout(() => {

        setCopiedMessage(null);

      }, 1800);

    } catch (error) {

      console.error(
        "Unable to copy answer:",
        error
      );

    }

  };


  // ============================================================
  // FORMAT RETRIEVAL SCORE
  // ============================================================

  const formatRetrievalScore = (
    score
  ) => {

    if (
      score === undefined ||
      score === null ||
      Number.isNaN(Number(score))
    ) {

      return "—";

    }

    return `${(
      Number(score) * 100
    ).toFixed(1)}%`;

  };


  // ============================================================
  // FORMAT RERANK SCORE
  // ============================================================

  const formatRerankScore = (
    score
  ) => {

    if (
      score === undefined ||
      score === null ||
      Number.isNaN(Number(score))
    ) {

      return "—";

    }

    return Number(score).toFixed(2);

  };


  // ============================================================
  // SOURCE QUALITY
  // ============================================================

  const getSourceQuality = (
    score
  ) => {

    const numericScore =
      Number(score);


    if (
      Number.isNaN(numericScore)
    ) {

      return "Source";

    }


    if (
      numericScore >= 0.65
    ) {

      return "High relevance";

    }


    if (
      numericScore >= 0.5
    ) {

      return "Relevant";

    }


    return "Retrieved";

  };


  // ============================================================
  // SELECTED DOCUMENT LABEL
  // ============================================================

  const selectedDocumentData =
    documents.find(
      (document) =>
        document.filename ===
        selectedDocument
    );


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <main className="ai-workspace">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="workspace-header">

        <div>

          <div className="workspace-eyebrow">

            <span className="workspace-live-dot" />

            DOCUMENT INTELLIGENCE

          </div>


          <h1>
            Ask your knowledge base.
          </h1>


          <p>

            Ask questions about your uploaded
            documents and receive grounded answers
            powered by retrieval-augmented generation.

          </p>

        </div>


        <button
          className="clear-chat-button"
          onClick={clearConversation}
          disabled={
            messages.length === 0 ||
            loading
          }
        >

          <RotateCcw size={15} />

          Clear chat

        </button>

      </section>


      {/* ======================================================
          DOCUMENT SELECTOR
      ====================================================== */}

      <section className="document-selector-section">

        <div className="document-selector-label">

          <FileText size={14} />

          <span>
            SEARCH IN
          </span>

        </div>


        <div className="document-selector-wrapper">

          <select
            value={
              selectedDocument || ""
            }

            onChange={(event) => {

              setSelectedDocument(
                event.target.value ||
                null
              );

            }}

            disabled={
              loading ||
              documentsLoading
            }

            className="document-selector"
          >

            <option value="">

              ✦ All Documents

            </option>


            {documents.map(
              (document) => (

                <option
                  key={
                    document.filename
                  }

                  value={
                    document.filename
                  }
                >

                  {document.filename}

                </option>

              )
            )}

          </select>


          <ChevronDown
            size={16}
            className="document-selector-arrow"
          />

        </div>


        <div className="document-selector-hint">

          {documentsLoading ? (

            "Loading documents..."

          ) : selectedDocument ? (

            <>
              Searching only in{" "}

              <strong>
                {selectedDocument}
              </strong>

              {selectedDocumentData && (
                <>
                  {" "}
                  ·{" "}
                  {selectedDocumentData.pages}
                  {" "}
                  page
                  {selectedDocumentData.pages !== 1
                    ? "s"
                    : ""}
                  {" "}
                  ·{" "}
                  {selectedDocumentData.chunks}
                  {" "}
                  chunks
                </>
              )}

            </>

          ) : (

            <>
              Searching across all uploaded documents

              {documents.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  {documents.length} document
                  {documents.length !== 1
                    ? "s"
                    : ""}
                </>
              )}

            </>
          )}

        </div>

      </section>


      {/* ======================================================
          CHAT AREA
      ====================================================== */}

      <section className="chat-panel">


        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {messages.length === 0 &&
          !loading && (

            <div className="chat-empty">

              <div className="chat-orb">

                <div className="chat-orb-inner">

                  <Bot size={31} />

                </div>

              </div>


              <div className="chat-empty-badge">

                <Sparkles size={13} />

                GROUNDED AI

              </div>


              <h2>
                What would you like to know?
              </h2>


              <p>

                Ask anything about your uploaded
                documents. DocuMind retrieves the most
                relevant information before generating
                an answer.

              </p>


              <div className="suggestion-grid">

                {suggestions.map(
                  (suggestion) => (

                    <button
                      key={suggestion}
                      className="suggestion-card"
                      onClick={() =>
                        useSuggestion(
                          suggestion
                        )
                      }
                    >

                      <MessageSquare
                        size={15}
                      />

                      <span>
                        {suggestion}
                      </span>

                    </button>

                  )
                )}

              </div>

            </div>

          )}


        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {messages.length > 0 && (

          <div className="message-list">

            {messages.map(
              (message) => (

                <div
                  key={message.id}

                  className={`message-row ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >


                  {/* ==================================================
                      AVATAR
                  ================================================== */}

                  <div
                    className={`message-avatar ${
                      message.role === "user"
                        ? "user-avatar"
                        : "ai-avatar"
                    }`}
                  >

                    {message.role === "user" ? (

                      <User size={16} />

                    ) : (

                      <Bot size={16} />

                    )}

                  </div>


                  {/* ==================================================
                      CONTENT
                  ================================================== */}

                  <div className="message-content">


                    <div className="message-label">

                      {message.role === "user"
                        ? "You"
                        : "DocuMind AI"}

                    </div>


                    <div
                      className={`message-bubble ${
                        message.error
                          ? "message-error"
                          : ""
                      }`}
                    >

                      {message.content}

                    </div>


                    {/* ==================================================
                        DOCUMENT CONTEXT
                    ================================================== */}

                    {message.role === "assistant" &&
                      !message.error &&
                      message.filename && (

                        <div className="message-document-context">

                          <FileText
                            size={12}
                          />

                          <span>
                            Answered from
                          </span>

                          <strong>
                            {message.filename}
                          </strong>

                        </div>

                      )}


                    {/* ==================================================
                        AI ACTIONS
                    ================================================== */}

                    {message.role === "assistant" &&
                      !message.error && (

                        <div className="message-actions">

                          <button
                            type="button"

                            onClick={() =>
                              copyAnswer(
                                message.id,
                                message.content
                              )
                            }

                            className="message-action-button"
                          >

                            {copiedMessage ===
                            message.id ? (

                              <>

                                <Check
                                  size={13}
                                />

                                Copied

                              </>

                            ) : (

                              <>

                                <Copy
                                  size={13}
                                />

                                Copy

                              </>

                            )}

                          </button>

                        </div>

                      )}


                    {/* ==================================================
                        SOURCES
                    ================================================== */}

                    {message.role === "assistant" &&
                      message.sources?.length > 0 && (

                        <div className="sources-container">


                          {/* SOURCE TOGGLE */}

                          <button
                            type="button"

                            className="sources-toggle"

                            onClick={() =>
                              toggleSources(
                                message.id
                              )
                            }
                          >

                            <div className="sources-toggle-left">

                              <div className="sources-toggle-icon">

                                <FileText
                                  size={14}
                                />

                              </div>


                              <div>

                                <strong>

                                  {
                                    message
                                      .sources
                                      .length
                                  }{" "}

                                  sources

                                </strong>

                                <span>
                                  Grounded evidence
                                </span>

                              </div>

                            </div>


                            <ChevronDown
                              size={15}

                              className={
                                expandedSources[
                                  message.id
                                ]
                                  ? "rotate"
                                  : ""
                              }
                            />

                          </button>


                          {/* SOURCE LIST */}

                          {expandedSources[
                            message.id
                          ] && (

                            <div className="source-list">

                              {message.sources.map(
                                (
                                  source,
                                  index
                                ) => (

                                  <div
                                    className="source-card"

                                    key={`${message.id}-${index}`}
                                  >

                                    <div className="source-card-top">


                                      {/* SOURCE ICON */}

                                      <div className="source-icon">

                                        <FileText
                                          size={16}
                                        />

                                      </div>


                                      {/* SOURCE INFO */}

                                      <div className="source-info">

                                        <strong>

                                          {
                                            source.filename ||
                                            "Unknown document"
                                          }

                                        </strong>

                                        <span>

                                          Page{" "}

                                          {
                                            source.page ??
                                            "—"
                                          }

                                          {" • "}

                                          Chunk{" "}

                                          {
                                            source.chunk_index ??
                                            "—"
                                          }

                                        </span>

                                      </div>


                                      {/* RELEVANCE BADGE */}

                                      <span className="source-relevance">

                                        {getSourceQuality(
                                          source.retrieval_score
                                        )}

                                      </span>

                                    </div>


                                    {/* SOURCE METRICS */}

                                    <div className="source-metrics">


                                      <div className="source-metric">

                                        <span>
                                          Retrieval
                                        </span>

                                        <strong>

                                          {formatRetrievalScore(
                                            source.retrieval_score
                                          )}

                                        </strong>

                                      </div>


                                      <div className="source-metric">

                                        <span>
                                          Rerank
                                        </span>

                                        <strong>

                                          {formatRerankScore(
                                            source.rerank_score
                                          )}

                                        </strong>

                                      </div>


                                      <div className="source-index">

                                        #{index + 1}

                                      </div>

                                    </div>

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      )}

                  </div>

                </div>

              )
            )}


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

              <div className="message-row assistant-message">

                <div className="message-avatar ai-avatar">

                  <Bot size={16} />

                </div>


                <div className="message-content">

                  <div className="message-label">

                    DocuMind AI

                  </div>


                  <div className="thinking-bubble">

                    <div className="thinking-icon">

                      <Loader2
                        size={16}
                        className="spin"
                      />

                    </div>

                    <div>

                      <strong>
                        Thinking with your documents
                      </strong>

                      <span>

                        Searching
                        {selectedDocument
                          ? ` ${selectedDocument}`
                          : " all documents"}
                        {" → "}
                        reranking
                        {" → "}
                        generating

                      </span>

                    </div>

                  </div>

                </div>

              </div>

            )}


            <div
              ref={messagesEndRef}
            />

          </div>

        )}

      </section>


      {/* ======================================================
          INPUT
      ====================================================== */}

      <section className="chat-input-area">


        <form
          className="chat-input-wrapper"
          onSubmit={handleSubmit}
        >

          <MessageSquare
            size={18}
            className="input-icon"
          />


          <textarea
            ref={textareaRef}

            value={question}

            onChange={(event) =>
              setQuestion(
                event.target.value
              )
            }

            onKeyDown={handleKeyDown}

            placeholder={
              selectedDocument
                ? `Ask something about ${selectedDocument}...`
                : "Ask something about your documents..."
            }

            rows={1}

            disabled={loading}
          />


          <button
            type="submit"

            className="send-button"

            disabled={
              !question.trim() ||
              loading
            }
          >

            {loading ? (

              <Loader2
                size={17}
                className="spin"
              />

            ) : (

              <Send size={17} />

            )}

          </button>

        </form>


        <div className="input-hint">

          <span>
            Enter to send
          </span>

          <span>
            Shift + Enter for new line
          </span>

          <span className="powered-by">

            <Sparkles size={11} />

            RAG + Cross-Encoder + Ollama

          </span>

        </div>

      </section>

    </main>

  );

}


export default AIWorkspace;