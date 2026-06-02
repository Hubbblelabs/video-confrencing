import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Req,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BillingService } from './billing.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '../shared/enums';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Get('wallet')
    async getWallet(@Req() req: any) {
        return this.billingService.getOrCreateWallet(req.user.id);
    }

    @Get('transactions')
    async getTransactions(@Req() req: any) {
        return this.billingService.getTransactions(req.user.id);
    }

    @Post('topup')
    async topup(@Req() req: any, @Body() body: { amount: number }) {
        if (!Number.isInteger(body.amount) || body.amount <= 0 || body.amount > 10000) {
            throw new BadRequestException('Amount must be a positive integer up to 10000');
        }
        return this.billingService.addCredits({
            userId: req.user.id,
            amount: body.amount,
            // TODO: Replace with real payment provider transaction ID
            providerTransactionId: `dev_${uuidv4()}`,
            metadata: { method: 'mock_topup' },
        });
    }

    @Get('admin/stats')
    @Roles(UserRole.ADMIN)
    async getAdminStats() {
        return this.billingService.getAdminStats();
    }

    @Get('admin/wallets')
    @Roles(UserRole.ADMIN)
    async getStudentWallets(@Query('search') search?: string) {
        return this.billingService.getAllStudentWallets(search);
    }

    @Post('admin/add-credits')
    @Roles(UserRole.ADMIN)
    async adminAddCredits(@Body() body: { userId: string; amount: number }) {
        await this.billingService.getOrCreateWallet(body.userId);
        return this.billingService.addCredits({
            userId: body.userId,
            amount: body.amount,
            metadata: { method: 'admin_topup' },
        });
    }
}
