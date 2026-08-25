import { useState } from "react";

import {
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Check,
  SlidersHorizontal,
} from "lucide-react";

import { queryDocument } from "../services/api";


// ============================================================
// ANSWER FORMATTER
// ============================================================

function formatAnswer(text) {
  if (!text) {
    return "The document does not specify this information.";
  }

  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/â/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€¢/g, "•")
    .replace(/Â·/g, "·")
    .trim();
}


// ============================================================
// SOURCE NORMALIZER
// ============================================================

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  const seen = new Set();

  return sources.filter((source) => {
    if (!source) {
      return false;
    }

    const key = [
      source.filename || "",
      source.page ?? "",
      source.chunk_index ?? "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}


// ============================================================
// ANSWER RENDERER
// ============================================================

function AnswerContent({ content }) {
  const cleaned = formatAnswer(content);

  const lines = cleaned.split("\n");

  return (
    <div className="answer-content">

      {lines.map((line, index) => {

        const trimmed = line.trim();

        if (!trimmed) {
          return (
            <div
              key={`space-${index}`}
              className="answer-spacer"
            />
          );
        }

        // ------------------------------------------------------
        // Numbered list
        // ------------------------------------------------------

        const numberedMatch =
          trimmed.match(/^(\d+)[.)]\s+(.*)$/);

        if (numberedMatch) {
          return (
            <div
              key={index}
              className="answer-list-item"
            >
              <span className="answer-list-number">
                {numberedMatch[1]}.
              </span>

              <span>
                {numberedMatch[2]}
              </span>
            </div>
          );
        }

        // ------------------------------------------------------
        // Bullet
        // ------------------------------------------------------

        const bulletMatch =
          trimmed.match(/^[-•*]\s+(.*)$/);

        if (bulletMatch) {
          return (
            <div
              key={index}
              className="answer-list-item"
            >
              <span className="answer-bullet">
                •
              </span>

              <span>
                {bulletMatch[1]}
              </span>
            </div>
          );
        }

        // ------------------------------------------------------
        // Heading-like line
        // ------------------------------------------------------

        const headingMatch =
          trimmed.match(
            /^(Languages|Generative AI|ML\/AI Frameworks|Backend|Frontend|Databases|Tools & Platforms|Core Concepts|Tech Stack|Project|Certifications)\s*:/i
          );

        if (headingMatch) {
          const separatorIndex =
            trimmed.indexOf(":");

          const heading =
            trimmed.slice(
              0,
              separatorIndex + 1
            );

          const remainder =
            trimmed.slice(
              separatorIndex + 1
            ).trim();

          return (
            <div
              key={index}
              className="answer-category"
            >
              <strong>
                {heading}
              </strong>

              {remainder && (
                <span>
                  {" "}
                  {remainder}
                </span>
              )}
            </div>
          );
        }

        // ------------------------------------------------------
        // Normal paragraph
        // ------------------------------------------------------

        return (
          <p
            key={index}
            className="answer-paragraph"
          >
            {trimmed}
          </p>
        );
      })}

    </div>
  );
}


// ============================================================
// CHAT
// ============================================================

function Chat({ documents = [] }) {

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState([]);

  const [expandedSources, setExpandedSources] =
    useState({});

  const [copiedIndex, setCopiedIndex] =
    useState(null);

  const [selectedDocument, setSelectedDocument] =
    useState(null);


  // ==========================================================
  // ASK QUESTION
  // ==========================================================

  const askQuestion = async (
    text = question
  ) => {

    const cleanQuestion =
      text.trim();

    if (
      !cleanQuestion ||
      loading
    ) {
      return;
    }

    setQuestion("");

    // --------------------------------------------------------
    // USER MESSAGE
    // --------------------------------------------------------

    const userMessage = {
      role: "user",
      content: cleanQuestion,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setLoading(true);

    try {

      // ------------------------------------------------------
      // CALL RAG API
      // ------------------------------------------------------

      const result =
        await queryDocument(
          cleanQuestion,
          selectedDocument
        );

      // ------------------------------------------------------
      // BACKEND ERROR
      // ------------------------------------------------------

      if (result?.error) {

        throw new Error(
          result.error
        );
      }

      // ------------------------------------------------------
      // ANSWER
      // ------------------------------------------------------

      const answer =
        result?.answer?.trim() ||
        "The document does not specify this information.";

      // ------------------------------------------------------
      // SOURCES
      // ------------------------------------------------------

      const sources =
        normalizeSources(
          result?.sources
        );

      // ------------------------------------------------------
      // ASSISTANT MESSAGE
      // ------------------------------------------------------

      const assistantMessage = {
        role: "assistant",
        content: answer,
        sources,
        selectedDocument,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

    } catch (error) {

      console.error(
        "RAG query error:",
        error
      );

      let errorMessage =
        "Something went wrong while processing your question.";

      if (
        error?.response?.data?.detail
      ) {
        errorMessage =
          error.response.data.detail;
      } else if (
        error?.response?.data?.error
      ) {
        errorMessage =
          error.response.data.error;
      } else if (
        error?.message
      ) {
        errorMessage =
          error.message;
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: errorMessage,
          sources: [],
          error: true,
        },
      ]);

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // FORM
  // ==========================================================

  const handleSubmit = (
    event
  ) => {

    event.preventDefault();

    askQuestion();

  };


  // ==========================================================
  // SOURCE TOGGLE
  // ==========================================================

  const toggleSources = (
    index
  ) => {

    setExpandedSources(
      (previous) => ({
        ...previous,
        [index]:
          !previous[index],
      })
    );

  };


  // ==========================================================
  // COPY
  // ==========================================================

  const copyAnswer = async (
    text,
    index
  ) => {

    try {

      await navigator.clipboard.writeText(
        text
      );

      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex(null);
      }, 1500);

    } catch (error) {

      console.error(
        "Copy failed:",
        error
      );

    }

  };


  // ==========================================================
  // CLEAR
  // ==========================================================

  const clearChat = () => {

    setMessages([]);

    setExpandedSources({});

    setCopiedIndex(null);

  };


  // ==========================================================
  // SUGGESTIONS
  // ==========================================================

  const suggestions = [
    "What certifications does Vishnu have?",
    "What technical skills does Vishnu have?",
    "What projects has Vishnu worked on?",
  ];


  // ==========================================================
  // DOCUMENT LABEL
  // ==========================================================

  const selectedDocumentLabel =
    selectedDocument ||
    "All Documents";


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <main className="chat-page">

      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <section className="chat-header">

        <div>

          <div className="chat-eyebrow">

            <Sparkles size={15} />

            GROUNDED AI

          </div>

          <h1>
            Ask your documents.
          </h1>

          <p>
            Get answers grounded in your
            uploaded knowledge base.
          </p>

        </div>

        <div className="rag-active">

          <span />

          RAG Active

        </div>

      </section>


      {/* ==================================================== */}
      {/* DOCUMENT SELECTOR */}
      {/* ==================================================== */}

      <section className="document-context-bar">

        <div className="document-context-left">

          <div className="document-context-icon">

            <SlidersHorizontal
              size={16}
            />

          </div>

          <div>

            <span className="document-context-label">
              Search scope
            </span>

            <strong>
              {selectedDocumentLabel}
            </strong>

          </div>

        </div>


        <select
          value={
            selectedDocument || ""
          }
          onChange={(event) => {

            const value =
              event.target.value;

            setSelectedDocument(
              value || null
            );

            // Clear previous conversation
            // when document changes.

            setMessages([]);

            setExpandedSources({});

            setCopiedIndex(null);

          }}
          disabled={
            loading ||
            documents.length === 0
          }
          className="document-selector"
        >

          <option value="">
            All Documents
          </option>

          {documents.map(
            (document) => (

              <option
                key={document.filename}
                value={document.filename}
              >
                {document.filename}
              </option>

            )
          )}

        </select>

      </section>


      {/* ==================================================== */}
      {/* CHAT */}
      {/* ==================================================== */}

      <section className="chat-container">

        {/* ================================================== */}
        {/* EMPTY */}
        {/* ================================================== */}

        {messages.length === 0 &&
          !loading && (

            <div className="chat-empty">

              <div className="ai-orb">

                <div className="ai-orb-inner">

                  <Bot size={34} />

                </div>

              </div>


              <h2>

                {documents.length > 0
                  ? "Your documents are ready."
                  : "Upload a document to begin."}

              </h2>


              <p>

                {documents.length > 0

                  ? selectedDocument
                    ? `Ask questions specifically about ${selectedDocument}.`
                    : "Ask anything about your uploaded documents. DocuMind will retrieve relevant information and generate a grounded answer."

                  : "Upload a PDF document from the Documents page to start asking questions."}

              </p>


              {documents.length > 0 && (

                <div className="suggestion-grid">

                  {suggestions.map(
                    (suggestion) => (

                      <button
                        key={suggestion}
                        className="suggestion-card"
                        onClick={() =>
                          askQuestion(
                            suggestion
                          )
                        }
                      >

                        <Sparkles
                          size={15}
                        />

                        <span>
                          {suggestion}
                        </span>

                      </button>

                    )
                  )}

                </div>

              )}

            </div>

          )}


        {/* ================================================== */}
        {/* MESSAGES */}
        {/* ================================================== */}

        {messages.length > 0 && (

          <div className="messages">

            {messages.map(
              (message, index) => (

                <div
                  key={index}
                  className={`message-row ${
                    message.role === "user"
                      ? "user-row"
                      : "assistant-row"
                  }`}
                >

                  {/* AVATAR */}

                  <div
                    className={`message-avatar ${
                      message.role === "user"
                        ? "user-avatar"
                        : "ai-avatar"
                    }`}
                  >

                    {message.role ===
                    "user" ? (

                      <User
                        size={17}
                      />

                    ) : (

                      <Bot
                        size={17}
                      />

                    )}

                  </div>


                  {/* MESSAGE */}

                  <div className="message-content">

                    <div className="message-label">

                      {message.role ===
                      "user"
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

                      {message.role ===
                      "assistant" ? (

                        <AnswerContent
                          content={
                            message.content
                          }
                        />

                      ) : (

                        message.content

                      )}

                    </div>


                    {/* ================================================= */}
                    {/* COPY */}
                    {/* ================================================= */}

                    {message.role ===
                      "assistant" &&
                      !message.error && (

                        <div className="answer-actions">

                          <button
                            onClick={() =>
                              copyAnswer(
                                message.content,
                                index
                              )
                            }
                          >

                            {copiedIndex ===
                            index ? (

                              <Check
                                size={14}
                              />

                            ) : (

                              <Copy
                                size={14}
                              />

                            )}

                            {copiedIndex ===
                            index
                              ? "Copied"
                              : "Copy"}

                          </button>

                        </div>

                      )}


                    {/* ================================================= */}
                    {/* SOURCES */}
                    {/* ================================================= */}

                    {message.role ===
                      "assistant" &&
                      !message.error &&
                      message.sources?.length >
                        0 && (

                        <div className="sources-wrapper">

                          <button
                            className="sources-toggle"
                            onClick={() =>
                              toggleSources(
                                index
                              )
                            }
                          >

                            <span>

                              <FileText
                                size={14}
                              />

                              {message.sources.length}
                              {" "}
                              sources

                            </span>


                            {expandedSources[
                              index
                            ] ? (

                              <ChevronUp
                                size={15}
                              />

                            ) : (

                              <ChevronDown
                                size={15}
                              />

                            )}

                          </button>


                          {expandedSources[
                            index
                          ] && (

                            <div className="sources-panel">

                              {message.sources.map(
                                (
                                  source,
                                  sourceIndex
                                ) => {

                                  const retrievalScore =
                                    Number(
                                      source.retrieval_score ??
                                      source.score ??
                                      0
                                    );

                                  const hasRerank =
                                    source.rerank_score !==
                                    undefined &&
                                    source.rerank_score !==
                                    null;

                                  const rerankScore =
                                    Number(
                                      source.rerank_score ??
                                      0
                                    );

                                  return (

                                    <div
                                      className="source-item"
                                      key={`${source.filename}-${source.page}-${source.chunk_index}-${sourceIndex}`}
                                    >

                                      <div className="source-icon">

                                        <FileText
                                          size={15}
                                        />

                                      </div>


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

                                          {" · "}

                                          Chunk{" "}
                                          {
                                            source.chunk_index ??
                                            "—"
                                          }

                                        </span>

                                      </div>


                                      <div className="source-score">

                                        {Math.round(
                                          Math.max(
                                            0,
                                            Math.min(
                                              1,
                                              retrievalScore
                                            )
                                          ) * 100
                                        )}

                                        %

                                      </div>


                                      {hasRerank && (

                                        <div className="source-rerank-score">

                                          Rerank{" "}

                                          {rerankScore.toFixed(
                                            2
                                          )}

                                        </div>

                                      )}

                                    </div>

                                  );

                                }
                              )}

                            </div>

                          )}

                        </div>

                      )}


                    {/* ================================================= */}
                    {/* NO SOURCES */}
                    {/* ================================================= */}

                    {message.role ===
                      "assistant" &&
                      !message.error &&
                      message.sources?.length ===
                        0 && (

                        <div className="no-sources-message">

                          <FileText
                            size={14}
                          />

                          Answer generated without
                          retrieved source metadata.

                        </div>

                      )}

                  </div>

                </div>

              )
            )}


            {/* ================================================= */}
            {/* LOADING */}
            {/* ================================================= */}

            {loading && (

              <div className="message-row assistant-row">

                <div className="message-avatar ai-avatar">

                  <Bot size={17} />

                </div>


                <div className="message-content">

                  <div className="message-label">
                    DocuMind AI
                  </div>


                  <div className="thinking-bubble">

                    <div className="thinking-step active">

                      <span />

                      Retrieving relevant chunks

                    </div>


                    <div className="thinking-step active">

                      <span />

                      Reranking sources

                    </div>


                    <div className="thinking-step active">

                      <span />

                      Generating grounded answer

                    </div>

                  </div>

                </div>

              </div>

            )}

          </div>

        )}

      </section>


      {/* ==================================================== */}
      {/* INPUT */}
      {/* ==================================================== */}

      <form
        className="chat-input-wrapper"
        onSubmit={handleSubmit}
      >

        <div className="chat-input-icon">

          <Sparkles size={18} />

        </div>


        <input
          value={question}
          onChange={(event) =>
            setQuestion(
              event.target.value
            )
          }
          placeholder={
            documents.length > 0
              ? selectedDocument
                ? `Ask about ${selectedDocument}...`
                : "Ask something about your documents..."
              : "Upload a document to start asking questions..."
          }
          disabled={
            loading ||
            documents.length === 0
          }
        />


        <button
          type="submit"
          disabled={
            loading ||
            !question.trim() ||
            documents.length === 0
          }
          className="send-button"
        >

          {loading ? (

            <RefreshCw
              size={19}
              className="spin"
            />

          ) : (

            <Send size={19} />

          )}

        </button>

      </form>


      {/* ==================================================== */}
      {/* FOOTER */}
      {/* ==================================================== */}

      <div className="chat-footer">

        <span>
          Enter to send · Shift + Enter
          for new line
        </span>

        <span>
          ✦ RAG · Cross-Encoder · Ollama
        </span>

        {selectedDocument && (

          <span>
            📄 {selectedDocument}
          </span>

        )}

        {messages.length > 0 && (

          <button
            type="button"
            onClick={clearChat}
            className="clear-chat"
          >
            Clear conversation
          </button>

        )}

      </div>

    </main>

  );
}


export default Chat;