import { Module } from '@nestjs/common';
import { ConferenceGateway } from './conference.gateway';
import { WsAuthService } from './ws-auth.service';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { WebrtcModule } from '../webrtc/webrtc.module';

@Module({
  imports: [AuthModule, RoomsModule, WebrtcModule],
  providers: [ConferenceGateway, WsAuthService],
  exports: [ConferenceGateway],
})
export class GatewayModule {}
