import {
  X,
  FileText,
  FileStack,
  Layers3,
  CheckCircle2,
  BrainCircuit,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

function DocumentDetailsModal({
  document,
  onClose,
  onAskAI,
}) {
  if (!document) {
    return null;
  }

  const pages = document.pages ?? 0;
  const chunks = document.chunks ?? 0;

  return (
    <div
      className="document-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div className="document-modal">

        {/* Header */}
        <div className="document-modal-header">

          <div className="document-modal-title">

            <div className="modal-file-icon">
              <FileText size={25} />
            </div>

            <div>
              <span className="modal-eyebrow">
                DOCUMENT DETAILS
              </span>

              <h2 title={document.filename}>
                {document.filename}
              </h2>
            </div>

          </div>

          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>

        </div>


        {/* Status banner */}
        <div className="document-ready-banner">

          <div className="ready-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <strong>
              Document indexed successfully
            </strong>

            <span>
              This document is ready for AI-powered
              question answering.
            </span>
          </div>

          <div className="ready-status">
            <span />
            Ready
          </div>

        </div>


        {/* Main information */}
        <div className="document-modal-grid">

          {/* File */}
          <div className="modal-info-card">

            <div className="modal-info-icon purple">
              <FileText size={20} />
            </div>

            <div>
              <span>File type</span>
              <strong>PDF Document</strong>
            </div>

          </div>


          {/* Pages */}
          <div className="modal-info-card">

            <div className="modal-info-icon blue">
              <FileStack size={20} />
            </div>

            <div>
              <span>Total pages</span>
              <strong>{pages}</strong>
            </div>

          </div>


          {/* Chunks */}
          <div className="modal-info-card">

            <div className="modal-info-icon green">
              <Layers3 size={20} />
            </div>

            <div>
              <span>Indexed chunks</span>
              <strong>{chunks}</strong>
            </div>

          </div>


          {/* RAG */}
          <div className="modal-info-card">

            <div className="modal-info-icon cyan">
              <BrainCircuit size={20} />
            </div>

            <div>
              <span>Knowledge status</span>
              <strong>Indexed</strong>
            </div>

          </div>

        </div>


        {/* Processing pipeline */}
        <div className="modal-section">

          <div className="modal-section-heading">

            <div>
              <span className="eyebrow">
                AI PIPELINE
              </span>

              <h3>
                Knowledge processing
              </h3>
            </div>

          </div>


          <div className="processing-pipeline">

            <div className="pipeline-step completed">

              <div className="pipeline-icon">
                <FileText size={18} />
              </div>

              <div>
                <strong>
                  PDF extracted
                </strong>

                <span>
                  Text successfully extracted
                </span>
              </div>

              <CheckCircle2
                className="pipeline-check"
                size={18}
              />

            </div>


            <div className="pipeline-line" />


            <div className="pipeline-step completed">

              <div className="pipeline-icon">
                <Layers3 size={18} />
              </div>

              <div>
                <strong>
                  Content chunked
                </strong>

                <span>
                  {chunks} knowledge chunks created
                </span>
              </div>

              <CheckCircle2
                className="pipeline-check"
                size={18}
              />

            </div>


            <div className="pipeline-line" />


            <div className="pipeline-step completed">

              <div className="pipeline-icon">
                <BrainCircuit size={18} />
              </div>

              <div>
                <strong>
                  Vector indexed
                </strong>

                <span>
                  Available for semantic retrieval
                </span>
              </div>

              <CheckCircle2
                className="pipeline-check"
                size={18}
              />

            </div>

          </div>

        </div>


        {/* Security / grounding */}
        <div className="grounding-card">

          <ShieldCheck size={20} />

          <div>
            <strong>
              Grounded AI enabled
            </strong>

            <span>
              DocuMind will use this document as
              a knowledge source when answering
              your questions.
            </span>
          </div>

        </div>


        {/* Footer */}
        <div className="document-modal-footer">

          <button
            className="modal-secondary-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            className="modal-primary-button"
            onClick={() => {
              onAskAI(document);
              onClose();
            }}
          >
            <MessageSquareText size={18} />
            Ask AI about this document
          </button>

        </div>

      </div>

    </div>
  );
}

export default DocumentDetailsModal;