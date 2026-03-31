// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const { Server } = require("socket.io"); // Socket.IO for real-time communication
const mongoose = require("mongoose"); // Mongoose for MongoDB connection
const Document = require("./schema"); // Document model (schema.js)

// Connect to MongoDB using connection string stored in .env
mongoose
  .connect(process.env.DB_CONNECTION_SECRET)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Default value for new documents (empty Quill Delta object)
const defaultValue = { ops: [] };

// Initialize Socket.IO server on port 3001
// Allow CORS requests from frontend running on http://localhost:5173
const io = new Server(3001, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://google-docs-clone-yvcm.onrender.com",
    ],
    methods: ["GET", "POST"],
  },
});

// Handle new client connections
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Client requests a document by ID
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);

    // Join a room specific to this document ID
    socket.join(documentId);

    // Send initial document data back to client
    socket.emit("load-document", document.data);

    // Listen for changes from this client and broadcast to others
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // Save document periodically or when requested
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// Helper function: find existing document or create a new one
async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;

  // If document does not exist, create a new one with default value
  return await Document.create({ _id: id, data: defaultValue });
}
