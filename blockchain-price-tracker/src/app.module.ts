import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { price } from './price/price.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { PriceService } from './price/price.service';
import { PriceController } from './price/price.controller';
import { MailerService } from './mailer.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'faizan',
      password: 'faizan',
      database: 'postgres',
      entities: [price],
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([price]),
  ],
  controllers: [PriceController],
  providers: [PriceService, MailerService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) { }

  async onModuleInit() {
    if (!this.dataSource.isInitialized) {
      try {
        await this.dataSource.initialize();
        console.log('Database connected successfully.');
      } catch (error) {
        console.error('Database connection failed:', error);
      }
    } else {
      console.log('Database connection already established.');
    }
  }
}
