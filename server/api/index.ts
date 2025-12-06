import express from 'express';
import dotenv from 'dotenv';
import tiktokShopAuthRoutes from '../src/routes/tiktok-shop-auth.routes.js';
import tiktokShopDataRoutes from '../src/routes/tiktok-shop-data.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware - Support both local and production frontend URLs
const allowedOrigins = [
    'http://localhost:5173',
    'https://tiktok-dashboard-frontend-eight.vercel.app',
    'https://tiktok-dashboard-frontend-iqcmesvmn.vercel.app',
    FRONTEND_URL
];

// Comprehensive CORS middleware for Vercel
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    } else if (!origin) {
        // Allow requests with no origin (like curl, mobile apps)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

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

export default app;
