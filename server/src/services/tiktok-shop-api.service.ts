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
            appSecret: process.env.TIKTOK_SHOP_APP_SECRET || '',
            apiBase: process.env.TIKTOK_SHOP_API_BASE || 'https://open-api.tiktokglobalshop.com',
            authBase: process.env.TIKTOK_AUTH_BASE || 'https://auth.tiktok-shops.com',
        };

        // Debug logging
        console.log('TikTok Shop API Service initialized with:');
        console.log('  APP_KEY:', this.config.appKey ? `${this.config.appKey.substring(0, 5)}...` : 'MISSING');
        console.log('  APP_SECRET:', this.config.appSecret ? `${this.config.appSecret.substring(0, 5)}...` : 'MISSING');
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
}

export const tiktokShopApi = new TikTokShopApiService();
