import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { price } from './price.entity'; // Ensure the entity is named properly
import { Cron } from '@nestjs/schedule';
import { MailerService } from '../mailer.service';
import Moralis from 'moralis';
import axios from 'axios';
import { MoreThan } from 'typeorm';


@Injectable()
export class PriceService {
    constructor(
        @InjectRepository(price) // Corrected entity reference
        private priceRepository: Repository<price>,
        private readonly mailerService: MailerService,
    ) {
        this.initializeMoralis();
    }

    async initializeMoralis() {
        try {
            await Moralis.start({
                apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImEyYTNjNTViLTkxZWItNDk2OC1iNDA4LTU3YTlmZjc0ZjQxOSIsIm9yZ0lkIjoiNDEzMDUxIiwidXNlcklkIjoiNDI0NDc3IiwidHlwZUlkIjoiOGU5Mjk5ZmUtM2ZjZC00MjRhLTlhYTktODM4NzFmN2I5ZWIwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Mjk3MTQ1MTEsImV4cCI6NDg4NTQ3NDUxMX0.udJcybwE0rDZmihIm-AJAHaZz2ZVPrgJedLLepzc454', // Replace with your actual API key
            });
        } catch (error) {
            console.error('Failed to initialize Moralis:', error);
        }
    }

    @Cron('*/1 * * * *')  // runs every 5 minutes
    async fetchAndStoreprices() {
        const ethprice = await this.getpriceFromAPI('eth');
        const polygonprice = await this.getpriceFromAPI('matic'); // Assuming you want to include Polygon

        const previousEthprice = await this.getLastprice('eth');
        const previousPolygonprice = await this.getLastprice('matic');

        await this.saveprice('eth', ethprice);
        await this.saveprice('matic', polygonprice);

        const email = 'immuhammadfaizan@gmail.com'; // Use the specified email

        await this.checkpriceAndNotify('eth', ethprice, previousEthprice, email);
        await this.checkpriceAndNotify('matic', polygonprice, previousPolygonprice, email);
    }

    async getpriceFromAPI(chain: string): Promise<number> {
        try {
            // Fetch the price based on the chain
            if (chain === 'eth') {
                return await this.getEthToUsdRate();
            } else if (chain === 'matic') {
                // Fetch Polygon price similarly if needed
                return await this.getMaticToUsdRate(); // Define this method accordingly
            }
            return 0;
        } catch (error) {
            console.error('Error fetching price for', chain, ':', error.message);
            return 0; // Fallback value
        }
    }

    async getEthToUsdRate(): Promise<number> {
        try {
            const response = await Moralis.EvmApi.token.getTokenPrice({
                "chain": "0x1",
                "include": "percent_change",
                "address": "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0"
            });
            console.log(response.result.usdPrice);
            return response.result.usdPrice; // Return the USD price for WETH (ETH price)
        } catch (error) {
            console.error('Error fetching ETH to USD rate:', error.response ? error.response.data : error.message);
            return 1800; // Fallback value
        }
    }

    async getMaticToUsdRate(): Promise<number> {
        try {
            const response = await Moralis.EvmApi.token.getTokenPrice({
                "chain": "0x89",
                "include": "percent_change",
                "address": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"// Polygon
            });
            console.log(response.result.usdPrice);
            return response.result.usdPrice; // Return the USD price for MATIC
        } catch (error) {
            console.error('Error fetching MATIC to USD rate:', error.response ? error.response.data : error.message);
            return 1; // Fallback value
        }
    }




    async saveprice(chain: string, priceValue: number) {
        const priceEntity = new price();
        priceEntity.chain = chain;
        priceEntity.price = priceValue;
        await this.priceRepository.save(priceEntity);
    }

    async getLastprice(chain: string): Promise<number> {
        const lastpriceEntry = await this.priceRepository.findOne({
            where: { chain },
            order: { createdat: 'DESC' }, // Ensure you have createdAt timestamp in the price entity
        });
        return lastpriceEntry ? lastpriceEntry.price : 0; // Fallback to 0 if no previous price exists
    }

    async checkpriceAndNotify(chain: string, currentprice: number, previousprice: number, email: string) {
        const percentageChange = ((currentprice - previousprice) / previousprice) * 100;

        if (percentageChange > 3) {
            await this.mailerService.sendPriceAlert(email, chain, currentprice);
        }
    }

    async getpricesForLast24Hours(): Promise<any[]> {
        // Implement your logic to fetch prices for the last 24 hours from the database
        return await this.priceRepository.find({
            where: { createdat: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) }, // Assuming createdAt is a Date field
            order: { createdat: 'ASC' },
        });
    }

    // New function to get swap rate
    async getSwapRate(amount: number): Promise<any> {
        const ethToBtcRate = await this.getEthToBtcRate(); // Define this function to fetch current ETH to BTC rate
        const feePercentage = 0.03;

        const btcReceived = amount * ethToBtcRate;
        const totalFeeInEth = amount * feePercentage;
        const totalFeeInUsd = totalFeeInEth * await this.getEthToUsdRate(); // Fetch USD equivalent of the fee

        return {
            btcReceived,
            totalFee: {
                eth: totalFeeInEth,
                usd: totalFeeInUsd,
                percentage: feePercentage,
            },
        };
    }

    async getEthToBtcRate(): Promise<number> {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd';
        try {
            const response = await axios.get(url);
            const ethprice = response.data.ethereum.usd;
            const btcprice = response.data.bitcoin.usd;
            return ethprice / btcprice; // Return ETH to BTC conversion rate
        } catch (error) {
            console.error('Error fetching ETH to BTC rate:', error.message);
            return 0; // Fallback value
        }
    }
}
