import {
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Database,
  FileCheck2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Files,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import {
  getDocuments,
  uploadDocument,
  deleteDocument,
} from "../services/api";

import "./Documents.css";


function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [dragging, setDragging] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDocuments();

      setDocuments(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {
      console.error(
        "Failed to load documents:",
        err
      );

      setError(
        "Unable to load documents. Make sure FastAPI and Qdrant are running."
      );

    } finally {
      setLoading(false);
    }
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDocuments();
  }, []);


  // ============================================================
  // OPEN FILE PICKER
  // ============================================================

  const openFilePicker = () => {
    if (uploading) {
      return;
    }

    fileInputRef.current?.click();
  };


  // ============================================================
  // VALIDATE FILE
  // ============================================================

  const validateFile = (file) => {
    if (!file) {
      return false;
    }

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      setError(
        "Only PDF documents are supported."
      );

      return false;
    }

    return true;
  };


  // ============================================================
  // UPLOAD DOCUMENT
  // ============================================================

  const handleUpload = async (file) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      await uploadDocument(file);

      setMessage(
        `${file.name} uploaded and processed successfully.`
      );

      await loadDocuments();

    } catch (err) {
      console.error(
        "Upload failed:",
        err
      );

      const backendMessage =
        err?.response?.data?.detail;

      setError(
        backendMessage ||
        "Document upload failed. Please check the backend logs."
      );

    } finally {
      setUploading(false);
    }
  };


  // ============================================================
  // FILE INPUT
  // ============================================================

  const handleFileChange = async (event) => {
    const file =
      event.target.files?.[0];

    if (file) {
      await handleUpload(file);
    }

    event.target.value = "";
  };


  // ============================================================
  // DRAG EVENTS
  // ============================================================

  const handleDragOver = (event) => {
    event.preventDefault();

    if (!uploading) {
      setDragging(true);
    }
  };


  const handleDragLeave = (event) => {
    event.preventDefault();

    setDragging(false);
  };


  const handleDrop = async (event) => {
    event.preventDefault();

    setDragging(false);

    if (uploading) {
      return;
    }

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      await handleUpload(file);
    }
  };


  // ============================================================
  // DELETE DOCUMENT
  // ============================================================

  const handleDelete = async (filename) => {
    const confirmed = window.confirm(
      `Delete "${filename}"?\n\nThis will remove the document's chunks from the vector database.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(filename);
      setError("");
      setMessage("");

      await deleteDocument(filename);

      setMessage(
        `${filename} deleted successfully.`
      );

      await loadDocuments();

    } catch (err) {
      console.error(
        "Delete failed:",
        err
      );

      const backendMessage =
        err?.response?.data?.detail;

      setError(
        backendMessage ||
        "Failed to delete the document."
      );

    } finally {
      setDeleting(null);
    }
  };


  // ============================================================
  // STATS
  // ============================================================

  const totalPages = documents.reduce(
    (total, document) =>
      total + Number(document.pages || 0),
    0
  );

  const totalChunks = documents.reduce(
    (total, document) =>
      total + Number(document.chunks || 0),
    0
  );


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="documents-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="documents-header">

        <div>

          <div className="documents-eyebrow">
            <span className="documents-live-dot" />

            KNOWLEDGE BASE
          </div>

          <h1>
            Your documents.
          </h1>

          <p>
            Upload, manage, and organize the
            documents that power DocuMind AI.
          </p>

        </div>


        <button
          className="refresh-button"
          onClick={loadDocuments}
          disabled={loading}
        >

          <RefreshCw
            size={15}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          Refresh

        </button>

      </section>


      {/* ======================================================
          STATUS MESSAGE
      ====================================================== */}

      {message && (

        <div className="status-message success">

          <CheckCircle2 size={17} />

          <span>
            {message}
          </span>

        </div>

      )}


      {error && (

        <div className="status-message error">

          <AlertCircle size={17} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <section className="document-stats">

        <div className="document-stat-card">

          <div className="document-stat-icon purple">
            <Files size={19} />
          </div>

          <div>
            <span>
              Documents
            </span>

            <strong>
              {documents.length}
            </strong>
          </div>

        </div>


        <div className="document-stat-card">

          <div className="document-stat-icon blue">
            <FileText size={19} />
          </div>

          <div>
            <span>
              Pages
            </span>

            <strong>
              {totalPages}
            </strong>
          </div>

        </div>


        <div className="document-stat-card">

          <div className="document-stat-icon green">
            <Database size={19} />
          </div>

          <div>
            <span>
              Vector chunks
            </span>

            <strong>
              {totalChunks}
            </strong>
          </div>

        </div>

      </section>


      {/* ======================================================
          UPLOAD SECTION
      ====================================================== */}

      <section className="documents-section">

        <div className="section-heading">

          <div>

            <span className="section-label">
              KNOWLEDGE INGESTION
            </span>

            <h2>
              Add a document
            </h2>

            <p>
              Upload a PDF to add it to your
              DocuMind knowledge base.
            </p>

          </div>

        </div>


        <div
          className={`document-upload-zone ${
            dragging
              ? "dragging"
              : ""
          } ${
            uploading
              ? "uploading"
              : ""
          }`}

          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
        >

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            hidden
          />


          <div className="upload-icon-wrapper">

            {uploading ? (
              <Loader2
                size={28}
                className="spin"
              />
            ) : (
              <Upload size={28} />
            )}

          </div>


          <h3>
            {uploading
              ? "Processing document..."
              : "Drop your PDF here"}
          </h3>


          <p>
            {uploading
              ? "Extracting text, generating embeddings, and storing vectors."
              : "Drag and drop a PDF or click to browse your computer."}
          </p>


          {!uploading && (

            <div className="upload-format-row">

              <span>
                PDF
              </span>

              <small>
                Your document will be indexed for grounded AI answers.
              </small>

            </div>

          )}

        </div>

      </section>


      {/* ======================================================
          DOCUMENT LIST
      ====================================================== */}

      <section className="documents-section document-list-section">

        <div className="section-heading">

          <div>

            <span className="section-label">
              INDEXED KNOWLEDGE
            </span>

            <h2>
              Uploaded documents
            </h2>

            <p>
              Documents currently available to
              DocuMind AI.
            </p>

          </div>


          <span className="document-count">
            {documents.length}{" "}
            {documents.length === 1
              ? "document"
              : "documents"}
          </span>

        </div>


        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (

          <div className="documents-loading">

            <Loader2
              size={23}
              className="spin"
            />

            <span>
              Loading documents...
            </span>

          </div>

        )}


        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!loading &&
          documents.length === 0 && (

            <div className="documents-empty">

              <div className="empty-icon">
                <FileText size={25} />
              </div>

              <h3>
                No documents yet
              </h3>

              <p>
                Upload your first PDF above to
                start building your knowledge base.
              </p>

            </div>

          )}


        {/* ====================================================
            DOCUMENT CARDS
        ==================================================== */}

        {!loading &&
          documents.length > 0 && (

            <div className="document-list">

              {documents.map((document) => {

                const isDeleting =
                  deleting === document.filename;

                return (

                  <article
                    key={document.filename}
                    className="document-card"
                  >

                    <div className="document-file-icon">

                      <FileCheck2 size={22} />

                    </div>


                    <div className="document-info">

                      <h3>
                        {document.filename}
                      </h3>

                      <div className="document-meta">

                        <span>
                          {document.pages}{" "}
                          {document.pages === 1
                            ? "page"
                            : "pages"}
                        </span>

                        <span className="meta-divider">
                          •
                        </span>

                        <span>
                          {document.chunks}{" "}
                          {document.chunks === 1
                            ? "chunk"
                            : "chunks"}
                        </span>

                        <span className="meta-divider">
                          •
                        </span>

                        <span className="indexed-status">
                          Indexed
                        </span>

                      </div>

                    </div>


                    <button
                      className="delete-document-button"
                      onClick={() =>
                        handleDelete(
                          document.filename
                        )
                      }
                      disabled={isDeleting}
                      title="Delete document"
                    >

                      {isDeleting ? (
                        <Loader2
                          size={17}
                          className="spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}

                    </button>

                  </article>

                );

              })}

            </div>

          )}

      </section>

    </main>
  );
}


export default Documents;