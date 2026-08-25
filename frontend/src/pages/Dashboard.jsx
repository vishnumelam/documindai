import { useState } from "react";


import {
  ArrowUpRight,
  FileStack,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import UploadZone from "../components/UploadZone";
import DocumentCard from "../components/DocumentCard";
import SystemStatus from "../components/SystemStatus";
import DocumentDetailsModal from "../components/DocumentDetailsModal";


function Dashboard({
  documents,
  health,
  uploading,
  onUpload,
  onDelete,
  onOpenChat,
}) {
      const [selectedDocument, setSelectedDocument] =
    useState(null);

  /*
    Safety check.

    The Dashboard must always work with an array.

    If documents is accidentally:
      null
      undefined
      {}
      string

    we use an empty array instead.
  */

  const safeDocuments = Array.isArray(documents)
    ? documents
    : [];


  return (
    <main className="dashboard">


      {/* ================================================== */}
      {/* HERO */}
      {/* ================================================== */}

      <section className="hero-section">

        <div className="hero-content">

          <div className="hero-badge">

            <span className="pulse-dot" />

            AI DOCUMENT WORKSPACE

          </div>


          <h1>
            Turn documents into
            <span> intelligent conversations.</span>
          </h1>


          <p>
            Upload your knowledge base, ask questions,
            and discover answers with grounded AI.
          </p>


          <button
            className="hero-action"
            onClick={onOpenChat}
          >

            <MessageSquareText size={18} />

            Ask your documents

            <ArrowUpRight size={17} />

          </button>

        </div>


        {/* HERO DECORATION */}

        <div className="hero-decoration">

          <div className="orb orb-one" />

          <div className="orb orb-two" />

          <div className="orb orb-three" />

          <div className="hero-grid" />

        </div>

      </section>



      {/* ================================================== */}
      {/* STATS */}
      {/* ================================================== */}

      <section className="stats-grid">


        {/* DOCUMENT COUNT */}

        <div className="stat-card">

          <div className="stat-icon purple">

            <FileStack size={20} />

          </div>


          <div>

            <span>
              Documents
            </span>

            <strong>
              {safeDocuments.length}
            </strong>

          </div>

        </div>



        {/* AI ENGINE */}

        <div className="stat-card">

          <div className="stat-icon blue">

            <Sparkles size={20} />

          </div>


          <div>

            <span>
              AI Engine
            </span>

            <strong>
              Ready
            </strong>

          </div>

        </div>



        {/* RAG STATUS */}

        <div className="stat-card">

          <div className="stat-icon green">

            <MessageSquareText size={20} />

          </div>


          <div>

            <span>
              RAG Status
            </span>

            <strong>
              Active
            </strong>

          </div>

        </div>

      </section>



      {/* ================================================== */}
      {/* DOCUMENT UPLOAD */}
      {/* ================================================== */}

      <section className="workspace-section">


        <div className="section-heading">

          <div>

            <span className="eyebrow">
              KNOWLEDGE INGESTION
            </span>


            <h2>
              Add a document
            </h2>


            <p>
              Give DocuMind something to understand.
            </p>

          </div>

        </div>


        <UploadZone
          onUpload={onUpload}
          uploading={uploading}
        />

      </section>



      {/* ================================================== */}
      {/* DOCUMENTS + SYSTEM STATUS */}
      {/* ================================================== */}

      <section className="bottom-grid">


        {/* ================================================== */}
        {/* DOCUMENTS */}
        {/* ================================================== */}

        <div className="documents-section">


          <div className="section-heading compact">


            <div>

              <span className="eyebrow">
                YOUR KNOWLEDGE
              </span>


              <h2>
                Recent documents
              </h2>

            </div>


            <span className="document-count">

              {safeDocuments.length}

              {" "}

              {safeDocuments.length === 1
                ? "file"
                : "files"}

            </span>

          </div>



          {/* ================================================== */}
          {/* EMPTY STATE */}
          {/* ================================================== */}

          {safeDocuments.length === 0 ? (

            <div className="empty-documents">

              <FileStack size={30} />


              <h3>
                No documents yet
              </h3>


              <p>
                Upload your first document to start
                building your knowledge base.
              </p>

            </div>

          ) : (


            /* ================================================== */
            /* DOCUMENT LIST */
            /* ================================================== */

            <div className="document-list">

              {safeDocuments.map((document) => (

            

                <DocumentCard
                  key={document.filename}
                  document={document}
                  onDelete={onDelete}
                  onOpen={(document) =>
                    setSelectedDocument(document)
                  }
                />

              ))}

            </div>

          )}

        </div>



        {/* ================================================== */}
        {/* SYSTEM STATUS */}
        {/* ================================================== */}

        <SystemStatus
          health={health}
        />

      </section>
      <DocumentDetailsModal
        document={selectedDocument}
        onClose={() =>
           setSelectedDocument(null)
        }
        onAskAI={(document) => {
          console.log(
            "Opening AI Workspace for:",
            document.filename
          );

          onOpenChat();
        }}
      />

    </main>
  );
}


export default Dashboard;