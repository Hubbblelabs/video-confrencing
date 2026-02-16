import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Req,
    Query,
} from '@nestjs/common';
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
        return this.billingService.addCredits({
            userId: req.user.id,
            amount: body.amount,
            providerTransactionId: 'mock_' + Date.now(),
            metadata: { method: 'mock_topup' },
        });
    }

    @Get('admin/stats')
    @Roles(UserRole.ADMIN)
    async getAdminStats() {
        return this.billingService.getAdminStats();
    }
}
