// backend/src/socket.js
// Socket.io setup — attach to your HTTP server in app.js / server.js
//
// Usage in server.js:
//   const { createServer } = require('http');
//   const { Server }       = require('socket.io');
//   const { initSocket }   = require('./socket');
//
//   const httpServer = createServer(app);
//   initSocket(app, httpServer);
//   httpServer.listen(PORT, ...);

const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

/**
 * @param {import('express').Application} app  — Express app (we store io on it)
 * @param {import('http').Server}         httpServer
 */
function initSocket(app, httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    // Allow long-polling fallback
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware ─────────────────────────────────────────────────────────
  // Reads the JWT from the handshake auth token (sent by the client)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.id || decoded._id;
      socket.userName = decoded.name || 'User';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ──────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] connected  uid=${socket.userId}  sid=${socket.id}`);

    /**
     * Client joins a split's comment room.
     * Emit from client:  socket.emit('join_split', { splitId })
     */
    socket.on('join_split', ({ splitId }) => {
      if (!splitId) return;
      socket.join(`split:${splitId}`);
      console.log(`[socket] uid=${socket.userId} joined split:${splitId}`);
    });

    /**
     * Client leaves a split room.
     * Emit from client:  socket.emit('leave_split', { splitId })
     */
    socket.on('leave_split', ({ splitId }) => {
      if (!splitId) return;
      socket.leave(`split:${splitId}`);
    });

    /**
     * Client joins a group room (for future group-level events).
     */
    socket.on('join_group', ({ groupId }) => {
      if (!groupId) return;
      socket.join(`group:${groupId}`);
    });

    socket.on('leave_group', ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected uid=${socket.userId} reason=${reason}`);
    });
  });

  // Store io on app so controllers can emit via req.app.get('io')
  app.set('io', io);

  return io;
}

module.exports = { initSocket };