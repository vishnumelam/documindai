import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: 120000,
});


// ============================================================
// HEALTH
// ============================================================

export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};


// ============================================================
// DOCUMENTS
// ============================================================

export const getDocuments = async () => {
  const response = await api.get("/documents/");

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.documents)) {
    return data.documents;
  }

  return [];
};


// ============================================================
// UPLOAD
// ============================================================

export const uploadDocument = async (file) => {
  if (!file) {
    throw new Error("No file selected.");
  }

  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 180000,
    }
  );

  return response.data;
};


// ============================================================
// DELETE
// ============================================================

export const deleteDocument = async (filename) => {
  if (!filename) {
    throw new Error("Filename is required.");
  }

  const response = await api.delete(
    `/documents/${encodeURIComponent(filename)}`
  );

  return response.data;
};


// ============================================================
// QUERY
// ============================================================

export const queryDocument = async (
  question,
  filename = null
) => {
  if (!question || !question.trim()) {
    throw new Error("Question is required.");
  }

  const payload = {
    question: question.trim(),
    filename: filename || null,
  };

  const response = await api.post(
    "/query",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 180000,
    }
  );

  return response.data;
};


// ============================================================
// DEFAULT API
// ============================================================

export default api;