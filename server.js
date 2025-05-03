// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the docs directory
app.use(express.static(path.join(__dirname, 'docs')));

// Handle API routes
app.post('/api/chat', (req, res) => {
  // For now, just return a simple response
  res.json({
    candidates: [
      {
        content: {
          parts: [
            {
              text: "I'm the Bryneven Primary School Helper! How can I assist you today?"
            }
          ]
        }
      }
    ]
  });
});

// Serve HTML files directly from docs directory
app.get('/:page.html', (req, res, next) => {
  const pageName = req.params.page;
  const filePath = path.join(__dirname, 'docs', `${pageName}.html`);
  
  // Check if the file exists
  try {
    if (require('fs').existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    // If file doesn't exist, move to next handler
    next();
  } catch (err) {
    next();
  }
});

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// Catch-all handler for 404s
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'docs', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open your browser to see the ChatBot in action!`);
});
