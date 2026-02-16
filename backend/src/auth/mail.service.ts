import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    async sendVerificationEmail(email: string, token: string) {
        const url = `http://localhost:5173/verify-email?token=${token}`;
        this.logger.log(`📧 VERIFICATION EMAIL to ${email}: ${url}`);
        // In production, integrate with SendGrid/AWS SES
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const url = `http://localhost:5173/reset-password?token=${token}`;
        this.logger.log(`🔑 PASSWORD RESET EMAIL to ${email}: ${url}`);
        // In production, integrate with SendGrid/AWS SES
    }
}
