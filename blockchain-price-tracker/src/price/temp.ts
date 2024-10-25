import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { price } from './price.entity';
import { Cron } from '@nestjs/schedule';
import { MailerService } from '../mailer.service';
import Moralis from 'moralis';
import { ethers } from 'ethers';
import axios from 'axios';
import { MoreThan } from 'typeorm';


@Injectable()
export class PriceService {
    constructor(
        @InjectRepository(price)
        private priceRepository: Repository<price>,
        private readonly mailerService: MailerService, // Injecting MailerService
    ) {
        this.initializeMoralis();
    }

    // Initialize Moralis
    async initializeMoralis() {
        try {
            await Moralis.start({
                apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImEyYTNjNTViLTkxZWItNDk2OC1iNDA4LTU3YTlmZjc0ZjQxOSIsIm9yZ0lkIjoiNDEzMDUxIiwidXNlcklkIjoiNDI0NDc3IiwidHlwZUlkIjoiOGU5Mjk5ZmUtM2ZjZC00MjRhLTlhYTktODM4NzFmN2I5ZWIwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Mjk3MTQ1MTEsImV4cCI6NDg4NTQ3NDUxMX0.udJcybwE0rDZmihIm-AJAHaZz2ZVPrgJedLLepzc454',  // Replace with your actual API key
            });
        } catch (e) {
            console.error('Failed to initialize Moralis', e);
        }
    }

    @Cron('*/1 * * * *')  // runs every 5 minutes
    async fetchAndStorePrices() {
        // Fetch the current prices from the API
        const ethPrice = await this.getPriceFromAPI('eth');
        const polygonPrice = await this.getPriceFromAPI('matic');

        // Get the previous price from the database
        const previousEthPrice = await this.getLastPrice('eth');
        const previousPolygonPrice = await this.getLastPrice('matic');

        // Save the current prices to the database
        await this.savePrice('eth', ethPrice);
        await this.savePrice('matic', polygonPrice);

        const email = 'immuhammadfaizan@gmail.com';

        // Check price for Ethereum
        await this.checkPriceAndNotify('eth', ethPrice, previousEthPrice, email);

        // Check price for Polygon
        await this.checkPriceAndNotify('matic', polygonPrice, previousPolygonPrice, email);
    }

    async getPriceFromAPI(tokenAddress: string): Promise<number> {
        const chain = 'eth'; // Specify the chain (Ethereum)

        try {
            // Fetch token price using Moralis API
            const response = await Moralis.EvmApi.token.getTokenPrice({
                address: tokenAddress,
                chain: chain,
            });

            // Return the price in USD
            return response.result.usdPrice; // Assuming the response has a property `usdPrice`
        } catch (error) {
            console.error('Error fetching price:', error.message);
            return 0; // Return a fallback value on failure
        }
    }


    async getEthToBtcRate(): Promise<number> {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=btc';

        try {
            const response = await axios.get(url);
            const ethToBtcRate = response.data.ethereum.btc;
            return ethToBtcRate;
        } catch (error) {
            console.error('Error fetching ETH to BTC rate:', error.message);
            return 0; // Return a fallback value if there's an error
        }
    }

    // Method to calculate swap rate (ETH to BTC)
    async getSwapRate(ethAmount: number): Promise<any> {
        // Fetch the ETH to BTC conversion rate
        const ethToBtcRate = await this.getEthToBtcRate();

        if (ethToBtcRate === 0) {
            return {
                btcAmount: null,
                feeInEth: null,
                feeInUsd: null,
                message: 'Failed to fetch conversion rate.'
            };
        }

        // Calculate BTC amount
        const btcAmount = ethAmount * ethToBtcRate;

        // Calculate fee (0.03% of ETH amount)
        const feePercentage = 0.03;
        const feeInEth = ethAmount * feePercentage;

        // Fetch ETH to USD conversion rate for fee calculation
        const ethToUsdRate = await this.getEthToUsdRate();
        const feeInUsd = feeInEth * ethToUsdRate;

        return {
            btcAmount: btcAmount.toFixed(6), // Limit precision
            feeInEth: feeInEth.toFixed(6),
            feeInUsd: feeInUsd.toFixed(2)
        };
    }

    // Method to fetch ETH to USD rate
    async getEthToUsdRate(): Promise<number> {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

        try {
            const response = await axios.get(url);
            const ethPriceInUsd = response.data.ethereum.usd;
            return ethPriceInUsd;
        } catch (error) {
            console.error('Error fetching ETH to USD rate:', error.message);
            return 1800; // Fallback value if there's an error
        }
    }

    async savePrice(chain: string, pricee: number) {
        const priceEntity = new price();
        priceEntity.chain = chain;
        priceEntity.price = pricee;
        await this.priceRepository.save(priceEntity);
    }

    async getLastPrice(chain: string): Promise<number> {
        const lastPriceEntry = await this.priceRepository.findOne({
            where: { chain },
            order: { createdat: 'DESC' }, // Assuming you have a timestamp column
        });

        return lastPriceEntry ? lastPriceEntry.price : 0; // Return 0 if no previous price exists
    }

    async checkPriceAndNotify(chain: string, currentPrice: number, previousPrice: number, email: string) {
        const percentageChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        console.log('Percentage change for', chain, ':', percentageChange);

        if (percentageChange > 3) {
            await this.mailerService.sendPriceAlert(email, chain, currentPrice);
        }
    }

    async getPricesForLast24Hours(): Promise<price[]> {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        return this.priceRepository.find({
            where: { createdat: MoreThan(oneDayAgo) },
            order: { createdat: 'ASC' },
        });
    }

}
