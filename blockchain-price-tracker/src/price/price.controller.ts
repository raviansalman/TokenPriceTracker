import { PriceService } from './price.service';
import { Controller, Get, Query } from '@nestjs/common';  // Correct import for Query

@Controller('price')
export class PriceController {
    constructor(private readonly priceService: PriceService) { }

    @Get('hourly')
    async getHourlyPrices() {
        return this.priceService.getpricesForLast24Hours();
    }

    @Get('swap-rate')
    async getSwapRate(
        @Query('ethAmount') ethAmount: string
    ) {
        return await this.priceService.getSwapRate(parseFloat(ethAmount));
    }
}
