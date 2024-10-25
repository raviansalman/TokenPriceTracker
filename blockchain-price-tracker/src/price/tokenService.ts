import { Injectable } from '@nestjs/common';
import Moralis from 'moralis';

@Injectable()
export class TokenService {
    constructor() {
        this.initializeMoralis();
    }

    // Initialize Moralis with the API key
    async initializeMoralis() {
        try {
            await Moralis.start({
                apiKey: 'YOUR_API_KEY', // Replace with your actual API key
            });
        } catch (e) {
            console.error('Failed to initialize Moralis', e);
        }
    }

    // Fetch token price from Moralis EvmApi
    async getPriceFromAPI(chain: string): Promise<number> {
        const chainNetwork = chain === 'eth' ? '0x1' : '0x89'; // 0x1 for Ethereum, 0x89 for Polygon
        const tokenAddress =
            chain === 'eth'
                ? '0x0000000000000000000000000000000000000000' // Use a specific token address for Ethereum
                : '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'; // MATIC Token Address

        try {
            const response = await Moralis.EvmApi.token.getTokenPrice({
                chain: chainNetwork, // Ethereum or Polygon
                address: tokenAddress,
                include: 'percent_change', // Include percentage change in the response
            });

            return response.raw.usdPrice; // Assuming the response contains `usdPrice`
        } catch (error) {
            console.error('Error fetching token price:', error);
            throw new Error('Failed to fetch token price');
        }
    }
}
