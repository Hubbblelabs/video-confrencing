import { Module } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  providers: [WebrtcService],
  exports: [WebrtcService],
})
export class WebrtcModule {}
