import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tiktokShopAuthRoutes from './routes/tiktok-shop-auth.routes.js';
import tiktokShopDataRoutes from './routes/tiktok-shop-data.routes.js';

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
        service: 'Mamba - TikTok Shop Dashboard Backend',
    });
});

// Mount TikTok Shop routes
app.use('/api/tiktok-shop/auth', tiktokShopAuthRoutes);
app.use('/api/tiktok-shop', tiktokShopDataRoutes);

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
║   🛍️  Mamba - TikTok Shop Dashboard Backend               ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║   Frontend URL: ${FRONTEND_URL}                            ║
║                                                            ║
║   TikTok Shop API Endpoints:                               ║
║   - POST /api/tiktok-shop/auth/start                       ║
║   - GET  /api/tiktok-shop/auth/callback                    ║
║   - GET  /api/tiktok-shop/auth/status/:accountId           ║
║   - DELETE /api/tiktok-shop/auth/disconnect/:accountId     ║
║   - GET  /api/tiktok-shop/shops/:accountId                 ║
║   - GET  /api/tiktok-shop/orders/:accountId                ║
║   - GET  /api/tiktok-shop/products/:accountId              ║
║   - GET  /api/tiktok-shop/settlements/:accountId           ║
║   - GET  /api/tiktok-shop/performance/:accountId           ║
║   - POST /api/tiktok-shop/sync/:accountId                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
}

export default app;
