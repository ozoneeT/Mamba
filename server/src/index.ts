import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tiktokAuthRoutes from './routes/tiktok-auth.routes.js';
import tiktokDataRoutes from './routes/tiktok-data.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'TikTok Dashboard Backend',
    });
});

// Mount routes
app.use('/api/tiktok/auth', tiktokAuthRoutes);
app.use('/api/tiktok', tiktokDataRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// Start server if not running in Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 TikTok Dashboard Backend Server                      ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║   Frontend URL: ${FRONTEND_URL}                            ║
║                                                            ║
║   Available endpoints:                                     ║
║   - GET  /health                                           ║
║   - POST /api/tiktok/auth/start                            ║
║   - GET  /api/tiktok/auth/callback                         ║
║   - POST /api/tiktok/auth/refresh/:accountId               ║
║   - GET  /api/tiktok/auth/status/:accountId                ║
║   - DELETE /api/tiktok/auth/disconnect/:accountId          ║
║   - GET  /api/tiktok/user/:accountId                       ║
║   - GET  /api/tiktok/videos/:accountId                     ║
║   - GET  /api/tiktok/analytics/:accountId                  ║
║   - POST /api/tiktok/sync/:accountId                       ║
║   - GET  /api/tiktok/sync/status/:accountId                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
}

export default app;
