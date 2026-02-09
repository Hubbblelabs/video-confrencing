import { WsException } from '@nestjs/websockets';

export class WsAuthException extends WsException {
  constructor(message: string = 'Unauthorized') {
    super({ status: 'error', message });
  }
}

export class WsRoomException extends WsException {
  constructor(message: string) {
    super({ status: 'error', message });
  }
}

export class WsMediaException extends WsException {
  constructor(message: string) {
    super({ status: 'error', message });
  }
}

export class WsRateLimitException extends WsException {
  constructor() {
    super({ status: 'error', message: 'Rate limit exceeded' });
  }
}
