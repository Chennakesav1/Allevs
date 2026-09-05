require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const routes = require('./routes');
const error = require('./middleware/error');
const iot = require('./services/iot');

(async () => {
  try {
    // Local-development defaults are intentionally provided by backend/.env.
    // In production, replace the demo JWT secrets and Mongo URI.
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing. Check backend/.env');
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets missing. Check backend/.env');
    }

    await connectDB();

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: true, credentials: true } });

    const frontendRoot = path.resolve(__dirname, '../../frontend');
    const frontendDist = path.join(frontendRoot, 'dist');
    const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    process.env.UPLOAD_DIR = uploadDir;

    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '5mb' }));
    app.use(morgan('dev'));
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
    app.use((req, res, next) => { req.io = io; next(); });

    app.get('/health', (req, res) => res.json({
      ok: true,
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      service: 'ev-platform-api',
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      time: new Date().toISOString(),
    }));

    app.use('/api', routes);
    // Never let an unknown API request fall through to the SPA HTML.
    app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));
    app.use('/uploads', express.static(uploadDir));

    if (process.env.NODE_ENV !== 'production') {
      // Development: Vite runs as middleware INSIDE Express. No frontend/dist
      // folder or parallel build watcher is required, eliminating the 503 race.
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: frontendRoot,
        server: { middlewareMode: true, hmr: { server } },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Frontend: Vite middleware (same localhost, no dist required)');
    } else {
      if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
        throw new Error('Production frontend build missing. Run "npm run build" before "npm start".');
      }
      app.use(express.static(frontendDist));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/uploads/')) return res.status(404).end();
        return res.sendFile(path.join(frontendDist, 'index.html'));
      });
      console.log(`Frontend: ${frontendDist}`);
    }

    app.use(error);

    io.on('connection', socket => {
      socket.on('auth:user', id => id && socket.join(`user:${id}`));
      socket.on('join:job', id => id && socket.join(`job:${id}`));
    });

    console.log('IoT adapter:', iot.start(io).mode);
    const port = Number(process.env.PORT || 5000);
    server.listen(port, () => {
      console.log(`EV Platform running on http://localhost:${port}`);
      console.log(`Portal chooser:  http://localhost:${port}/`);
    });
  } catch (e) {
    console.error('\nSTARTUP FAILED:', e.message);
    console.error('Check backend/.env and ensure MongoDB is running.\n');
    process.exit(1);
  }
})();
