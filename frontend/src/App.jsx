import { useEffect, useState } from "react";
import Chat from "./pages/Chat";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ChatWorkspace from "./components/ChatWorkspace";

import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";

import {
  deleteDocument,
  getDocuments,
  getHealth,
  uploadDocument,
} from "./services/api";


function App() {

  const [activePage, setActivePage] =
    useState("dashboard");

  const [documents, setDocuments] =
    useState([]);

  const [health, setHealth] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const loadDashboard = async () => {

    try {

      setError("");

      const [
        documentsData,
        healthData,
      ] = await Promise.all([
        getDocuments(),
        getHealth(),
      ]);

      /*
       * Backend normally returns an array.
       * This extra check prevents:
       *
       * documents.map is not a function
       *
       * if the API response ever changes.
       */

      setDocuments(
        Array.isArray(documentsData)
          ? documentsData
          : []
      );

      setHealth(healthData);

    } catch (err) {

      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        "Unable to connect to the DocuMind backend."
      );

    }

  };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    loadDashboard();

  }, []);


  // =====================================================
  // UPLOAD DOCUMENT
  // =====================================================

  const handleUpload = async (file) => {

    if (!file) {
      return;
    }

    try {

      setUploading(true);
      setError("");

      await uploadDocument(file);

      await loadDashboard();

      /*
       * After successful upload,
       * automatically open Documents page.
       */

      setActivePage("documents");

    } catch (err) {

      console.error(
        "Upload error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Document upload failed."
      );

    } finally {

      setUploading(false);

    }

  };


  // =====================================================
  // DELETE DOCUMENT
  // =====================================================

  const handleDelete = async (filename) => {

    const confirmed =
      window.confirm(
        `Delete "${filename}"?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setError("");

      await deleteDocument(filename);

      await loadDashboard();

    } catch (err) {

      console.error(
        "Delete error:",
        err
      );

      setError(
        "Unable to delete the document."
      );

    }

  };


  // =====================================================
  // PAGE TITLE
  // =====================================================

  const getPageTitle = () => {

    switch (activePage) {

      case "chat":
        return "AI Workspace";

      case "documents":
        return "Documents";

      case "settings":
        return "Settings";

      default:
        return "Overview";

    }

  };


  return (

    <div className="app-shell">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />


      <div className="main-shell">

        <TopBar
          title={getPageTitle()}
        />


        {error && (

          <div className="error-banner">
            {error}
          </div>

        )}


        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        {activePage === "dashboard" && (

          <Dashboard
            documents={documents}
            health={health}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onOpenChat={() =>
              setActivePage("chat")
            }
          />

        )}


        {/* ================================================= */}
        {/* AI WORKSPACE */}
        {/* ================================================= */}


        {activePage === "chat" && (
          <Chat documents={documents} />
        )}


        {/* ================================================= */}
        {/* DOCUMENTS */}
        {/* ================================================= */}

        {activePage === "documents" && (

          <Documents
            documents={documents}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />

        )}


        {/* ================================================= */}
        {/* SETTINGS */}
        {/* ================================================= */}

        {activePage === "settings" && (

          <div className="placeholder-page">

            <h2>
              Settings
            </h2>

            <p>
              Settings interface coming later.
            </p>

          </div>

        )}

      </div>

    </div>

  );

}

export default App;