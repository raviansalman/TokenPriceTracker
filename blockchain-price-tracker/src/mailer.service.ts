// mailer.service.ts
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // Your SMTP server
            port: 587, // Common port for SMTP
            secure: false, // Use true for 465, false for other ports
            auth: {
                user: 'immuhammadfaizan@gmail.com', // Your email address
                pass: 'kqbe xwad pzns cqxh', // Your email password
            },
        });
    }

    async sendPriceAlert(email: string, chain: string, price: number) {
        const mailOptions = {
            from: '"Price Alert" <immuhammadfaizan@gmail.com>', // Sender address
            to: email, // List of receivers
            subject: `Price Alert: ${chain}`, // Subject line
            text: `The price of ${chain} has increased to $${price}.`, // Plain text body
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Price alert sent to ${email} for ${chain} at $${price}.`); // Log success
        } catch (error) {
            console.error(`Failed to send price alert to ${email}:`, error); // Log the error
            // Optionally, you can throw the error or handle it according to your application's needs
        }
    }


    
}
