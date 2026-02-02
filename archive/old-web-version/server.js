const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const STATE_FILE = path.join(__dirname, 'state.json');

let isActive = false;
let logs = [];
let logClients = []; // Store SSE clients for real-time updates

// Load saved state on startup
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      isActive = state.isActive || false;
      addLog(`Restored monitoring state: ${isActive ? 'Active' : 'Paused'}`, 'info');
    }
  } catch (error) {
    addLog(`Failed to load state: ${error.message}`, 'error');
  }
}

// Save state to disk
function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ isActive }), 'utf8');
  } catch (error) {
    addLog(`Failed to save state: ${error.message}`, 'error');
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get current config from file
function getCurrentConfig() {
  delete require.cache[require.resolve('./config')];
  return require('./config');
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ active: isActive });
});

app.post('/api/start', (req, res) => {
  isActive = true;
  saveState();
  addLog('Monitoring started via dashboard', 'success');
  res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
  isActive = false;
  saveState();
  addLog('Monitoring stopped via dashboard', 'warning');
  res.json({ success: true });
});

app.get('/api/config', (req, res) => {
  const config = getCurrentConfig();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    const configPath = path.join(__dirname, 'config.js');

    // Format the config nicely
    const configContent = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;

    // Write to file
    fs.writeFileSync(configPath, configContent, 'utf8');

    // Clear the require cache so the new config loads
    delete require.cache[require.resolve('./config')];

    // Notify about config change
    if (global.onConfigChange) {
      global.onConfigChange(newConfig);
    }

    addLog('Configuration saved successfully', 'success');
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    addLog(`Failed to save config: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/logs', (req, res) => {
  // Return logs in reverse order (newest first)
  res.json({ logs: logs.slice(-100).reverse() });
});

// Server-Sent Events endpoint for real-time log updates
app.get('/api/logs/stream', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

  // Send initial logs
  res.write(`data: ${JSON.stringify({ logs })}\n\n`);

  // Add client to list
  logClients.push(res);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 15000); // Every 15 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    logClients = logClients.filter(client => client !== res);
  });
});

app.post('/api/logs/clear', (req, res) => {
  // Clear the logs array first
  logs = [];

  // Broadcast clear event to all connected clients
  const clearEvent = { cleared: true };
  let successCount = 0;
  let failCount = 0;

  logClients.forEach((client, index) => {
    try {
      const data = `data: ${JSON.stringify(clearEvent)}\n\n`;
      client.write(data);
      successCount++;
    } catch (e) {
      failCount++;
    }
  });

  // Add the "cleared" message
  setTimeout(() => {
    addLog('Logs cleared', 'info');
  }, 200);

  res.json({ success: true, clientsNotified: successCount });
});

// Catch-all for any unknown routes - must be last
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

function addLog(message, level = 'info') {
  const log = {
    timestamp: new Date().toISOString(),
    message,
    level
  };
  logs.push(log);
  console.log(`[${level.toUpperCase()}] ${message}`);

  // Broadcast to all connected clients in real-time
  const logUpdate = { log };
  logClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(logUpdate)}\n\n`);
    } catch (e) {
      // Client disconnected
    }
  });
}

function isMonitoringActive() {
  return isActive;
}

function startServer(onConfigChange) {
  loadState(); // Load saved state before starting

  if (onConfigChange) {
    global.onConfigChange = onConfigChange;
  }

  app.listen(PORT, () => {
    console.log(`Midnight Guardian dashboard: http://localhost:${PORT}`);
    addLog(`Dashboard started on port ${PORT}`, 'info');
  });
}

module.exports = { startServer, isMonitoringActive, addLog };