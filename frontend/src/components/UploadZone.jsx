import {
  UploadCloud,
  FileText,
  FileType2,
  File,
  Sparkles,
} from "lucide-react";

import { useRef, useState } from "react";

function UploadZone({ onUpload, uploading }) {

  const inputRef = useRef(null);

  const [dragging, setDragging] =
    useState(false);

  const handleFiles = (files) => {

    if (!files || !files.length) {
      return;
    }

    onUpload(files[0]);
  };

  const handleDrop = (event) => {

    event.preventDefault();

    setDragging(false);

    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`upload-zone ${
        dragging ? "dragging" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() =>
        setDragging(false)
      }
      onDrop={handleDrop}
      onClick={() =>
        inputRef.current?.click()
      }
    >

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.txt,.docx"
        onChange={(event) =>
          handleFiles(event.target.files)
        }
      />

      <div className="upload-orbit">

        <div className="upload-main-icon">
          {uploading ? (
            <Sparkles size={28} />
          ) : (
            <UploadCloud size={28} />
          )}
        </div>

        <div className="floating-file file-one">
          <FileText size={15} />
        </div>

        <div className="floating-file file-two">
          <FileType2 size={15} />
        </div>

        <div className="floating-file file-three">
          <File size={15} />
        </div>

      </div>

      <div className="upload-content">

        <h3>
          {uploading
            ? "Analyzing your document..."
            : "Drop a document into the workspace"}
        </h3>

        <p>
          {uploading
            ? "Extracting text, generating embeddings and indexing..."
            : "Upload PDF, DOCX or TXT files and let DocuMind make them intelligent."}
        </p>

      </div>

      {!uploading && (
        <div className="upload-types">

          <span>PDF</span>
          <span>DOCX</span>
          <span>TXT</span>

          <small>
            Maximum file size depends on server configuration
          </small>

        </div>
      )}

    </div>
  );
}

export default UploadZone;