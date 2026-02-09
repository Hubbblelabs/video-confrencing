import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    let message = 'Internal server error';
    let status = 'error';

    if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        message = (errorObj['message'] as string) || message;
        status = (errorObj['status'] as string) || status;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled WS error: ${exception.message}`,
        exception.stack,
      );
    }

    client.emit('error', { status, message });
  }
}
