require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const routes = require('./routes');
const error = require('./middleware/error');
const iot = require('./services/iot');
const { startHubSyncScheduler } = require('./services/hubSync');

(async () => {
  try {
    // Local-development defaults are intentionally provided by backend/.env.
    // In production, replace the demo JWT secrets and Mongo URI.
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing. Check backend/.env');
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets missing. Check backend/.env');
    }

    await connectDB();

    // Google My Maps -> MongoDB hub sync. All four portals continue using their existing /hubs APIs.
    startHubSyncScheduler();

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: true, credentials: true } });

    const frontendRoot = path.resolve(__dirname, '../../frontend');
    const frontendDist = path.join(frontendRoot, 'dist');
    const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    process.env.UPLOAD_DIR = uploadDir;

    app.use(helmet({
      contentSecurityPolicy:     false,  // handled by Vite / no inline scripts to protect
      crossOriginOpenerPolicy:   false,  // MUST be false — "same-origin" breaks Razorpay 3DS popup
      crossOriginEmbedderPolicy: false,  // MUST be false — blocks Razorpay iframe loading
    }));
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
      const token = socket.handshake.auth?.token;
      if(token){try{const p=jwt.verify(token,process.env.JWT_ACCESS_SECRET);if(p?.id)socket.join(`user:${p.id}`);if(['CENTRAL_ADMIN','SUPER_ADMIN'].includes(p?.role))socket.join('role:command');if(p?.role==='FRANCHISEE')socket.join('role:franchisee');}catch(_){}}
      socket.on('auth:user', id => id && socket.join(`user:${id}`));
      socket.on('join:job', id => id && socket.join(`job:${id}`));
    });

    // 45-day general-service cycle. When a bike reaches its due date, register
    // a real Maintenance Register entry and notify Command Center. If the bike
    // is currently handed over to a customer, notify that customer as well.
    const runFleetServiceReminders = async () => {
      try {
        const { CommandVehicle, Notification, FleetMaintenance, VehicleRental } = require('./models');
        const now = new Date();
        const vehicles = await CommandVehicle.find({
          fleetOperatorId: { $ne: null },
          status: { $in: ['ASSIGNED','ACTIVE'] },
          nextGeneralServiceAt: { $lte: now },
        }).select('_id bikeId make model registrationNo fleetOperatorId nextGeneralServiceAt lastGeneralServiceAlertAt generalServiceIntervalDays').lean();

        const commandUsers = await require('./models').User.find({
          role: { $in: ['CENTRAL_ADMIN','SUPER_ADMIN'] }, active: { $ne: false }
        }).select('_id').lean();

        for (const v of vehicles) {
          const dueAt = v.nextGeneralServiceAt || now;
          const interval = Number(v.generalServiceIntervalDays || 45);
          const dueKey = new Date(dueAt).toISOString().slice(0,10);

          // Idempotency: a service record for this bike + due date means this
          // cycle has already been registered, even if the process restarted.
          let maintenance = await FleetMaintenance.findOne({
            vehicleId: v._id,
            type: 'GENERAL_SERVICE',
            scheduledAt: dueAt,
          });

          const activeRental = await VehicleRental.findOne({
            vehicleSource: 'COMMAND_VEHICLE',
            vehicleId: v._id,
            paymentStatus: 'PAID',
            status: { $in: ['HANDED_OVER','ACTIVE'] },
          }).sort('-handoverDate').lean();

          if (!maintenance) {
            maintenance = await FleetMaintenance.create({
              franchiseeId: v.fleetOperatorId,
              vehicleId: v._id,
              bikeId: v.bikeId,
              type: 'GENERAL_SERVICE',
              title: '45-Day General Service',
              description: `Automatic general service registration for ${v.bikeId || v.registrationNo || `${v.make} ${v.model}`}.`,
              status: 'SCHEDULED',
              priority: 'NORMAL',
              scheduledAt: dueAt,
              nextServiceAt: new Date(dueAt.getTime() + interval * 24 * 60 * 60 * 1000),
              customerId: activeRental?.customerId || null,
              customerSnapshot: activeRental?.vehicleSnapshot || null,
              createdBy: null,
            });
          }

          const notificationData = {
            vehicleId: v._id, bikeId: v.bikeId, registrationNo: v.registrationNo,
            make: v.make, model: v.model, dueAt, maintenanceId: maintenance._id,
            serviceIntervalDays: interval, dueKey,
          };

          // Command Center always receives the maintenance registration alert.
          if (commandUsers.length) {
            await Notification.insertMany(commandUsers.map(u => ({
              userId: u._id,
              type: 'GENERAL_SERVICE_DUE',
              title: '45-day general service registered',
              message: `${v.bikeId || v.registrationNo || `${v.make} ${v.model}`} has reached 45 days and a General Service was added to the Maintenance Register.`,
              data: notificationData,
            })));
          }

          // Fleet operator also gets the actionable service reminder.
          await Notification.create({
            userId: v.fleetOperatorId,
            type: 'GENERAL_SERVICE_DUE',
            title: '45-day general service due',
            message: `${v.bikeId || v.registrationNo || `${v.make} ${v.model}`} is due for its 45-day general service.`,
            data: notificationData,
          });

          // If the physical bike is currently with a customer, tell that
          // customer that the vehicle has reached its service interval.
          if (activeRental?.customerId) {
            await Notification.create({
              userId: activeRental.customerId,
              type: 'GENERAL_SERVICE_DUE',
              title: 'Vehicle general service due',
              message: `Your ${v.make || ''} ${v.model || ''}${v.bikeId ? ` (${v.bikeId})` : ''} has reached its 45-day general service interval. Please contact your fleet operator for the service arrangement.`,
              data: notificationData,
            });
          }

          // Move the next due date forward so the same interval is not registered
          // repeatedly on every six-hour scheduler pass.
          let next = new Date(dueAt);
          while (next <= now) next = new Date(next.getTime() + interval * 24 * 60 * 60 * 1000);
          await CommandVehicle.updateOne({ _id: v._id }, { $set: { lastGeneralServiceAlertAt: now, nextGeneralServiceAt: next } });
        }
      } catch (e) { console.error('Fleet service reminder cycle failed:', e.message); }
    };
    await runFleetServiceReminders();
    setInterval(runFleetServiceReminders, 6 * 60 * 60 * 1000);

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