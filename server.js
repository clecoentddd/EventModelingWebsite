const express = require("express");
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const app = express();
const PORT = 3000;

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));
console.log(`Serving static files from ${path.join(__dirname, "public")}`);

// Helper to read HTML snippets
const readFile = (filename) => {
  const filePath = path.join(__dirname, "public", filename);
  console.log(`Reading file: ${filePath}`);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`Error reading file ${filename}:`, err);
    return `<p>Error loading ${filename}</p>`;
  }
};


app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
