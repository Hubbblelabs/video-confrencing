import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly baseUrl = process.env['FRONTEND_URL'] || 'http://localhost:5173';

    async sendVerificationEmail(email: string, token: string) {
        const url = `${this.baseUrl}/verify-email?token=${token}`;
        // TODO: Replace with real email delivery (SendGrid / AWS SES / Nodemailer).
        // Until wired up, log the link so developers can verify manually.
        this.logger.warn(`[DEV] Verification email for ${email} — open this link: ${url}`);
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const url = `${this.baseUrl}/reset-password?token=${token}`;
        // TODO: Replace with real email delivery (SendGrid / AWS SES / Nodemailer).
        this.logger.warn(`[DEV] Password reset email for ${email} — open this link: ${url}`);
    }
}
