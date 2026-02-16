import {
    Controller,
    Patch,
    Body,
    UseGuards,
    Request,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ProfileController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
    ) { }

    @Patch()
    async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
        const userId = req.user.id;
        // 1. Update user logic
        const user = await this.usersService.update(userId, dto);

        // 2. Generate new token with updated claims (e.g. displayName)
        const token = this.authService.generateToken(user);

        // 3. Return both user and new token
        return {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                isActive: user.isActive,
                updatedAt: user.updatedAt,
            },
            accessToken: token.accessToken,
        };
    }
}
