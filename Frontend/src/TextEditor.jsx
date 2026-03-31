// Import React hooks and dependencies
import React, { useCallback, useEffect, useState } from "react";
import "quill/dist/quill.snow.css";   // Quill editor styles
import Quill from "quill";            // Quill rich text editor
import { io } from "socket.io-client"; // Socket.IO client for real-time communication
import { useParams } from "react-router-dom"; // Get document ID from URL

// Interval for auto-saving document (in milliseconds)
const SAVE_INTERVAL_MS = 2000;

// Toolbar configuration for Quill editor
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  // State for socket connection and Quill editor instance
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  // Get document ID from route parameter
  const { id: documentId } = useParams();

  // Initialize socket connection when component mounts
  useEffect(() => {
    const s = io("http://localhost:3001"); // Connect to backend server
    setSocket(s);

    // Cleanup: disconnect socket when component unmounts
    return () => {
      s.disconnect();
    };
  }, []);

  // Load document from server once socket and editor are ready
  useEffect(() => {
    if (socket == null || quill == null) return;

    // Listen for initial document data
    socket.once("load-document", (document) => {
      console.log("Loaded document:", document);
      quill.setContents(document); // Set editor contents
      quill.enable();              // Enable editing
    });

    // Request document by ID
    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // Auto-save document contents every SAVE_INTERVAL_MS
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // Apply changes received from other clients
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on("receive-changes", handler);

    // Cleanup listener
    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  // Send changes made by this client to others
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return; // Only broadcast user changes
      socket.emit("send-changes", delta);
    };

    quill.on("text-change", handler);

    // Cleanup listener
    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  // Initialize Quill editor inside wrapper div
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = ""; // Clear previous editor
    const editor = document.createElement("div");
    wrapper.append(editor);

    // Create Quill editor instance
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

    q.disable();           // Disable until document loads
    q.setText("Loading..."); // Placeholder text
    setQuill(q);           // Save editor instance in state
  }, []);

  // Render editor container
  return (
    <>
      <div id="container" ref={wrapperRef}></div>
    </>
  );
}