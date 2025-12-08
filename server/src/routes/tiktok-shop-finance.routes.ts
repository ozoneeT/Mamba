import express from 'express';
import { tiktokShopApi } from '../services/tiktok-shop-api.service.js';
import { getShopWithToken } from './tiktok-shop-data.routes.js';

const router = express.Router();

// Helper to handle API errors
const handleApiError = (res: express.Response, error: any) => {
    console.error('API Error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
    });
};

/**
 * GET /api/tiktok-shop/finance/statements/:accountId
 */
router.get('/statements/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { shopId, ...query } = req.query;

        const { accessToken, shopCipher } = await getShopWithToken(accountId, shopId as string);
        const data = await tiktokShopApi.getStatements(accessToken, shopCipher, query);

        res.json({ success: true, data });
    } catch (error) {
        handleApiError(res, error);
    }
});

/**
 * GET /api/tiktok-shop/finance/payments/:accountId
 */
router.get('/payments/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { shopId, ...query } = req.query;

        const { accessToken, shopCipher } = await getShopWithToken(accountId, shopId as string);
        const data = await tiktokShopApi.getPayments(accessToken, shopCipher, query);

        res.json({ success: true, data });
    } catch (error) {
        handleApiError(res, error);
    }
});

/**
 * GET /api/tiktok-shop/finance/withdrawals/:accountId
 */
router.get('/withdrawals/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { shopId, ...query } = req.query;

        const { accessToken, shopCipher } = await getShopWithToken(accountId, shopId as string);
        const data = await tiktokShopApi.getWithdrawals(accessToken, shopCipher, query);

        res.json({ success: true, data });
    } catch (error) {
        handleApiError(res, error);
    }
});

/**
 * GET /api/tiktok-shop/finance/transactions/:accountId/:statementId
 */
router.get('/transactions/:accountId/:statementId', async (req, res) => {
    try {
        const { accountId, statementId } = req.params;
        const { shopId, ...query } = req.query;

        const { accessToken, shopCipher } = await getShopWithToken(accountId, shopId as string);
        const data = await tiktokShopApi.getStatementTransactions(accessToken, shopCipher, statementId, query);

        res.json({ success: true, data });
    } catch (error) {
        handleApiError(res, error);
    }
});

/**
 * GET /api/tiktok-shop/finance/unsettled/:accountId
 */
router.get('/unsettled/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { shopId, ...query } = req.query;

        const { accessToken, shopCipher } = await getShopWithToken(accountId, shopId as string);
        const data = await tiktokShopApi.getUnsettledOrders(accessToken, shopCipher, query);

        res.json({ success: true, data });
    } catch (error) {
        handleApiError(res, error);
    }
});

export default router;
