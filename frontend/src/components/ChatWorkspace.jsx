import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  User,
} from "lucide-react";

import { queryDocument } from "../services/api";

function ChatWorkspace() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const result =
        await queryDocument(trimmedQuestion);

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          result.answer ||
          "I couldn't find this information in the uploaded document.",
        sources: result.sources || [],
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(error);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "I couldn't connect to the DocuMind RAG service. Please make sure the backend and Ollama are running.",
          sources: [],
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const formatAnswer = (text) => {
    return text.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split("\n").length - 1 && (
          <br />
        )}
      </span>
    ));
  };

  return (
    <main className="chat-workspace">

      {/* Header */}
      <div className="chat-heading">

        <div>
          <div className="chat-eyebrow">
            <Sparkles size={13} />
            GROUNDED AI
          </div>

          <h1>
            Ask your documents.
          </h1>

          <p>
            Get answers grounded in your uploaded
            knowledge base.
          </p>
        </div>

        <div className="rag-live-indicator">
          <span />
          RAG Active
        </div>

      </div>


      {/* Chat area */}
      <div className="chat-panel">

        {messages.length === 0 ? (

          <div className="chat-empty">

            <div className="chat-empty-icon">
              <Bot size={30} />
            </div>

            <h2>
              What would you like to know?
            </h2>

            <p>
              Ask a question about your uploaded
              documents and DocuMind will retrieve
              the most relevant information.
            </p>

            <div className="suggested-questions">

              <button
                onClick={() =>
                  setQuestion(
                    "What certifications does Vishnu have?"
                  )
                }
              >
                <MessageSquareText size={15} />
                What certifications does Vishnu have?
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "What projects has Vishnu worked on?"
                  )
                }
              >
                <MessageSquareText size={15} />
                What projects has Vishnu worked on?
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "What technical skills does Vishnu have?"
                  )
                }
              >
                <MessageSquareText size={15} />
                What technical skills does Vishnu have?
              </button>

            </div>

          </div>

        ) : (

          <div className="messages-container">

            {messages.map((message) => (

              <div
                key={message.id}
                className={`message-row ${message.role}`}
              >

                <div className="message-avatar">

                  {message.role === "assistant" ? (
                    <Bot size={17} />
                  ) : (
                    <User size={17} />
                  )}

                </div>

                <div className="message-content">

                  <span className="message-author">
                    {message.role === "assistant"
                      ? "DocuMind AI"
                      : "You"}
                  </span>

                  <div
                    className={`message-bubble ${
                      message.error
                        ? "message-error"
                        : ""
                    }`}
                  >
                    {formatAnswer(
                      message.content
                    )}
                  </div>


                  {/* Sources */}
                  {message.role ===
                    "assistant" &&
                    message.sources?.length > 0 && (

                      <details className="sources-dropdown">

                        <summary>
                          <FileText size={14} />

                          <span>
                            {message.sources.length}{" "}
                            sources
                          </span>

                          <ChevronDown size={14} />
                        </summary>

                        <div className="sources-list">

                          {message.sources.map(
                            (source, index) => (

                              <div
                                className="source-item"
                                key={`${source.filename}-${source.chunk_index}-${index}`}
                              >

                                <div className="source-icon">
                                  <FileText
                                    size={15}
                                  />
                                </div>

                                <div>
                                  <strong>
                                    {source.filename}
                                  </strong>

                                  <span>
                                    Page{" "}
                                    {source.page}
                                    {" · "}
                                    Chunk{" "}
                                    {source.chunk_index}
                                  </span>
                                </div>

                                <span className="source-score">
                                  {Math.round(
                                    source.retrieval_score *
                                      100
                                  )}
                                    %
                                </span>

                              </div>

                            )
                          )}

                        </div>

                      </details>

                    )}

                </div>

              </div>

            ))}


            {loading && (

              <div className="message-row assistant">

                <div className="message-avatar">
                  <Bot size={17} />
                </div>

                <div className="message-content">

                  <span className="message-author">
                    DocuMind AI
                  </span>

                  <div className="message-bubble thinking">

                    <Loader2
                      size={17}
                      className="spin"
                    />

                    <span>
                      Searching your knowledge base...
                    </span>

                  </div>

                </div>

              </div>

            )}

            <div ref={messagesEndRef} />

          </div>

        )}

      </div>


      {/* Input */}
      <form
        className="chat-input-wrapper"
        onSubmit={handleSubmit}
      >

        <div className="chat-input-icon">
          <MessageSquareText size={19} />
        </div>

        <textarea
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Ask something about your documents..."
          rows={1}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={
            !question.trim() || loading
          }
          className="chat-send-button"
        >
          {loading ? (
            <Loader2
              size={18}
              className="spin"
            />
          ) : (
            <Send size={18} />
          )}
        </button>

      </form>


      <div className="chat-footer">
        <span>
          Enter to send
        </span>

        <span>
          Shift + Enter for new line
        </span>

        <span className="chat-engine">
          <Sparkles size={12} />
          RAG · Cross-Encoder · Ollama
        </span>
      </div>

    </main>
  );
}

export default ChatWorkspace;