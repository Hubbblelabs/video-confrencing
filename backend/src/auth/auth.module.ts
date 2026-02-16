import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEntity } from '../database/entities';
import { UsersModule } from '../users/users.module';

import { MailService } from './mail.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.secret') ?? 'change-me';
        const expiration = config.get<number>('jwt.expiration') ?? 3600;
        return {
          secret,
          signOptions: {
            expiresIn: `${expiration}s` as const,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([UserEntity]),
    UsersModule,
  ],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, JwtStrategy, MailService],
  exports: [AuthService, JwtModule, MailService],
})
export class AuthModule { }
