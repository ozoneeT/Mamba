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

    constructor() {
        this.config = {
            appKey: process.env.TIKTOK_SHOP_APP_KEY || '',
            // TRIM whitespace to prevent signature errors from copy-pasting .env values
            appSecret: (process.env.TIKTOK_SHOP_APP_SECRET || '').trim(),
            apiBase: process.env.TIKTOK_SHOP_API_BASE || 'https://open-api.tiktokglobalshop.com',
            authBase: process.env.TIKTOK_AUTH_BASE || 'https://auth.tiktok-shops.com',
        };

        // Debug logging
        console.log('TikTok Shop API Service initialized with:');
        console.log('  Environment: PRODUCTION');
        console.log('  APP_KEY:', this.config.appKey ? `${this.config.appKey.substring(0, 5)}...` : 'MISSING');
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
            redirect_uri: redirectUri,
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

            const tokenData = response.data.data;
            console.log('Token exchange successful. Granted scopes:', tokenData.granted_scopes || 'No scopes returned');
            console.log('Access Token (first 10 chars):', tokenData.access_token ? `${tokenData.access_token.substring(0, 10)}...` : 'MISSING');

            return tokenData;
        } catch (error: any) {
            console.error('Error exchanging code for tokens:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
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
     * Generate signature for API requests (Fixed Logic)
     */
    private generateSignature(path: string, params: Record<string, any>): string {
        // 1. Filter out keys that should not be signed
        const excludeKeys = ['access_token', 'sign'];

        // 2. Sort keys alphabetically and filter out undefined/null/empty values
        const sortedKeys = Object.keys(params)
            .filter(key =>
                !excludeKeys.includes(key) &&
                params[key] !== undefined &&
                params[key] !== null &&
                params[key] !== ''
            )
            .sort();

        // 3. Concatenate KeyValue pairs
        let paramString = '';
        sortedKeys.forEach(key => {
            // Ensure value is converted to string exactly as it will be sent
            paramString += `${key}${String(params[key])}`;
        });

        // 4. Prepend Path
        let stringToSign = `${path}${paramString}`;

        // 5. Wrap with App Secret
        stringToSign = `${this.config.appSecret}${stringToSign}${this.config.appSecret}`;

        // DEBUG: Uncomment to see exactly what is being signed
        console.log(`[TikTokSign] Path: ${path}`);
        console.log(`[TikTokSign] Params:`, params);
        console.log(`[TikTokSign] StringToSign: ${stringToSign}`);

        // 6. HMAC-SHA256
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
            const path = endpoint;

            // System params that go into every request
            const systemParams: any = {
                app_key: this.config.appKey,
                timestamp: timestamp.toString(),
            };

            // Only add shop_cipher if it's explicitly provided and not null
            if (shopCipher) {
                systemParams.shop_cipher = shopCipher;
            }

            let signatureParams: any = { ...systemParams };
            let queryParams: any = { ...systemParams };
            let bodyParams: any = {};

            if (method === 'GET') {
                // For GET, all params are signed
                signatureParams = { ...signatureParams, ...params };
                queryParams = { ...queryParams, ...params };
            } else {
                // For POST (JSON), body is NOT signed in V2
                const { version, shop_id, shop_cipher: paramShopCipher, ...rest } = params;

                // Handle common special parameters that might be passed in params but belong in query
                if (version) {
                    signatureParams.version = version;
                    queryParams.version = version;
                }

                // If shop_id is provided, use it in both signature and query
                if (shop_id) {
                    signatureParams.shop_id = shop_id;
                    queryParams.shop_id = shop_id;

                    // If shop_id is present, we definitely don't need shop_cipher
                    delete signatureParams.shop_cipher;
                    delete queryParams.shop_cipher;
                } else {
                    // If NO shop_id, we use shop_cipher for signature
                    // BUT for POST requests, we do NOT send shop_cipher in the query params
                    // (It is signed, but not sent - inferred from access_token/context by server)
                    if (queryParams.shop_cipher) {
                        delete queryParams.shop_cipher;
                    }
                }

                bodyParams = rest;
            }

            // Generate signature
            const signature = this.generateSignature(path, signatureParams);
            queryParams.sign = signature;

            const url = `${this.config.apiBase}${path}`;

            const headers = {
                'x-tts-access-token': accessToken,
                'Content-Type': 'application/json',
            };

            let response;
            if (method === 'GET') {
                response = await axios.get(url, {
                    params: queryParams,
                    headers,
                });
            } else {
                response = await axios.post(
                    url,
                    bodyParams,
                    {
                        params: queryParams,
                        headers,
                    }
                );
            }

            if (response.data.code !== 0) {
                // Enhanced error logging
                console.error(`TikTok API Error [${response.data.code}]: ${response.data.message}`);
                console.error(`Req ID: ${response.data.request_id}`);
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error: any) {
            // Detailed error reporting for debugging signatures
            if (error.response?.data) {
                console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
                throw new Error(error.response.data.message || 'TikTok API request failed');
            }
            throw error;
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

            const signature = this.generateSignature(path, params);

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
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
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
        // Remove 'version' param if it exists, as it is now in the path
        const { version, ...rest } = params;
        return this.makeApiRequest('/order/202309/orders/search', accessToken, shopCipher, rest, 'POST');
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
     * POST /product/202502/products/search
     */
    async searchProducts(accessToken: string, shopCipher: string, params: any): Promise<any> {
        // Remove 'version' param if it exists, as it is now in the path
        const { version, ...rest } = params;
        return this.makeApiRequest('/product/202502/products/search', accessToken, shopCipher, rest, 'POST');
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
