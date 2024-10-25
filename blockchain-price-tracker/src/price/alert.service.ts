import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertService {
    private transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'immuhammadfaizan@gmail.com',
            pass: 'kqbe xwad pzns cqxh',
        },
    });

    async sendAlert(email: string, message: string) {
        await this.transporter.sendMail({
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Price Alert',
            text: message,
        });
    }
}
