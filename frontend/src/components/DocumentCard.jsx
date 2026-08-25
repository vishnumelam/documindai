import {
  FileText,
  Trash2,
  ExternalLink,
  Layers3,
  FileStack,
  CheckCircle2,
} from "lucide-react";

function DocumentCard({
  document,
  onDelete,
  onOpen,
}) {
  return (
    <div className="document-card">

      {/* Top section */}
      <div className="document-card-top">

        <div className="document-file-icon">
          <FileText size={24} />
        </div>

        <div className="document-status">
          <span className="status-dot" />
          Indexed
        </div>

      </div>

      {/* Document information */}
      <div className="document-card-content">

        <h3 title={document.filename}>
          {document.filename}
        </h3>

        <p>
          PDF knowledge source
        </p>

      </div>

      {/* Statistics */}
      <div className="document-card-stats">

        <div>
          <span>Pages</span>
          <strong>
            {document.pages ?? 0}
          </strong>
        </div>

        <div>
          <span>Chunks</span>
          <strong>
            {document.chunks ?? 0}
          </strong>
        </div>

      </div>

      {/* Actions */}
      <div className="document-card-actions">

        <button
          className="document-open-button"
          onClick={() => onOpen(document)}
        >
          <ExternalLink size={16} />
          View details
        </button>

        <button
          className="document-delete-button"
          onClick={() => onDelete(document.filename)}
          title="Delete document"
        >
          <Trash2 size={17} />
        </button>

      </div>

    </div>
  );
}

export default DocumentCard;