import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();


interface TikTokShopConfig {
    appKey: string;
    appSecret: string;
    apiBase: string;
    authBase: string;
}

interface TokenResponse {
    access_token: string;
    access_token_expire_in: number;
    refresh_token: string;
    refresh_token_expire_in: number;
    open_id: string;
    seller_name: string;
    seller_base_region: string;
}

export class TikTokShopApiService {
    private config: TikTokShopConfig;
    private isSandbox: boolean;

    constructor() {
        this.isSandbox = process.env.TIKTOK_SHOP_IS_SANDBOX === 'true';

        this.config = {
            appKey: process.env.TIKTOK_SHOP_APP_KEY || '',
            appSecret: process.env.TIKTOK_SHOP_APP_SECRET || '',
            apiBase: this.isSandbox
                ? 'https://open-api-sandbox.tiktokglobalshop.com'
                : (process.env.TIKTOK_SHOP_API_BASE || 'https://open-api.tiktokglobalshop.com'),
            authBase: this.isSandbox
                ? 'https://auth-sandbox.tiktok-shops.com'
                : (process.env.TIKTOK_AUTH_BASE || 'https://auth.tiktok-shops.com'),
        };

        // Debug logging
        console.log('TikTok Shop API Service initialized with:');
        console.log('  Environment:', this.isSandbox ? 'SANDBOX' : 'PRODUCTION');
        console.log('  APP_KEY:', this.config.appKey ? `${this.config.appKey.substring(0, 5)}...` : 'MISSING');
        console.log('  APP_SECRET:', this.config.appSecret ? `${this.config.appSecret.substring(0, 5)}...` : 'MISSING');
        console.log('  API_BASE:', this.config.apiBase);
        console.log('  AUTH_BASE:', this.config.authBase);
    }

    /**
     * Validate that credentials are configured
     */
    private validateCredentials(): void {
        if (!this.config.appKey || !this.config.appSecret) {
            throw new Error('TikTok Shop API credentials not configured');
        }
    }

    /**
     * Generate OAuth authorization URL
     */
    generateAuthUrl(state: string): string {
        this.validateCredentials();
        const redirectUri = process.env.TIKTOK_SHOP_REDIRECT_URI || '';

        const params = new URLSearchParams({
            app_key: this.config.appKey,
            state: state,
        });

        return `${this.config.authBase}/api/v2/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    async exchangeCodeForTokens(authCode: string): Promise<TokenResponse> {
        try {
            const url = `${this.config.authBase}/api/v2/token/get`;

            const params = {
                app_key: this.config.appKey,
                app_secret: this.config.appSecret,
                auth_code: authCode,
                grant_type: 'authorized_code',
            };

            const response = await axios.get(url, { params });

            if (response.data.code !== 0) {
                throw new Error(`Token exchange failed: ${response.data.message}`);
            }

            return response.data.data;
        } catch (error: any) {
            console.error('Error exchanging code for tokens:', error);
            throw new Error(`Failed to exchange authorization code: ${error.message}`);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
        try {
            const url = `${this.config.authBase}/api/v2/token/refresh`;

            const params = {
                app_key: this.config.appKey,
                app_secret: this.config.appSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            };

            const response = await axios.get(url, { params });

            if (response.data.code !== 0) {
                throw new Error(`Token refresh failed: ${response.data.message}`);
            }

            return response.data.data;
        } catch (error: any) {
            console.error('Error refreshing token:', error);
            throw new Error(`Failed to refresh access token: ${error.message}`);
        }
    }

    /**
     * Generate signature for API requests
     */
    private generateSignature(path: string, params: Record<string, any>, timestamp: number): string {
        // Sort parameters alphabetically
        const sortedKeys = Object.keys(params).sort();

        // Build the string to sign
        let stringToSign = `${path}`;
        sortedKeys.forEach(key => {
            stringToSign += `${key}${params[key]}`;
        });
        stringToSign += `timestamp${timestamp}`;

        // Create HMAC SHA256 signature
        const hmac = crypto.createHmac('sha256', this.config.appSecret);
        hmac.update(stringToSign);
        return hmac.digest('hex');
    }

    /**
     * Make authenticated API request to TikTok Shop
     */
    async makeApiRequest(
        endpoint: string,
        accessToken: string,
        shopCipher: string,
        params: Record<string, any> = {},
        method: 'GET' | 'POST' = 'GET'
    ): Promise<any> {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const path = `/api${endpoint}`;

            // Add required parameters
            const allParams = {
                app_key: this.config.appKey,
                timestamp: timestamp.toString(),
                shop_cipher: shopCipher,
                ...params,
            };

            // Generate signature
            const signature = this.generateSignature(path, allParams, timestamp);

            const url = `${this.config.apiBase}${path}`;

            const headers = {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json',
            };

            let response;
            if (method === 'GET') {
                response = await axios.get(url, {
                    params: { ...allParams, sign: signature },
                    headers,
                });
            } else {
                response = await axios.post(
                    url,
                    params,
                    {
                        params: {
                            app_key: this.config.appKey,
                            timestamp: timestamp.toString(),
                            sign: signature,
                        },
                        headers,
                    }
                );
            }

            if (response.data.code !== 0) {
                throw new Error(`API request failed: ${response.data.message}`);
            }

            return response.data.data;
        } catch (error: any) {
            console.error(`Error making API request to ${endpoint}:`, error);
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    /**
     * Get authorized shops for the access token
     */
    async getAuthorizedShops(accessToken: string): Promise<any[]> {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const path = '/authorization/202309/shops';

            const params = {
                app_key: this.config.appKey,
                timestamp: timestamp.toString(),
            };

            const signature = this.generateSignature(path, params, timestamp);

            const url = `${this.config.apiBase}${path}`;

            const response = await axios.get(url, {
                params: { ...params, sign: signature },
                headers: {
                    'x-tts-access-token': accessToken,
                    'Content-Type': 'application/json',
                },
            });

            if (response.data.code !== 0) {
                throw new Error(`Failed to get shops: ${response.data.message}`);
            }

            return response.data.data.shops || [];
        } catch (error: any) {
            console.error('Error getting authorized shops:', error);
            throw new Error(`Failed to get authorized shops: ${error.message}`);
        }
    }

    /**
     * Get Shop Information
     * GET /shop/get
     */
    async getShopInfo(accessToken: string, shopCipher: string): Promise<any> {
        return this.makeApiRequest('/shop/202309/shop_info', accessToken, shopCipher);
    }

    /**
     * Get Seller Performance Metrics
     * GET /seller/performance
     */
    async getSellerPerformance(accessToken: string, shopCipher: string): Promise<any> {
        return this.makeApiRequest('/seller/202309/performance', accessToken, shopCipher);
    }

    /**
     * Search Orders
     * POST /order/202309/orders/search
     */
    async searchOrders(accessToken: string, shopCipher: string, params: any): Promise<any> {
        return this.makeApiRequest('/order/202309/orders/search', accessToken, shopCipher, params, 'POST');
    }

    /**
     * Get Order Detail
     * GET /orders/{order_id}
     * Note: TikTok API might use a different path for single order, usually it's a list query with IDs
     * Using /order/202309/orders to get details
     */
    async getOrderDetails(accessToken: string, shopCipher: string, orderIds: string[]): Promise<any> {
        return this.makeApiRequest('/order/202309/orders', accessToken, shopCipher, { order_ids: orderIds }, 'GET');
    }

    /**
     * Search Products
     * POST /product/202309/products/search
     */
    async searchProducts(accessToken: string, shopCipher: string, params: any): Promise<any> {
        return this.makeApiRequest('/product/202309/products/search', accessToken, shopCipher, params, 'POST');
    }

    /**
     * Get Settlements
     * GET /finance/202309/statements
     */
    async getSettlements(accessToken: string, shopCipher: string, params: any): Promise<any> {
        return this.makeApiRequest('/finance/202309/statements', accessToken, shopCipher, params, 'GET');
    }

    /**
     * Get Payouts (Withdrawals)
     * GET /finance/202309/withdrawals
     */
    async getPayouts(accessToken: string, shopCipher: string, params: any): Promise<any> {
        return this.makeApiRequest('/finance/202309/withdrawals', accessToken, shopCipher, params, 'GET');
    }
}

export const tiktokShopApi = new TikTokShopApiService();
