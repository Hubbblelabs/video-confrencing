import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * HTTP Logging Interceptor
 * 
 * Logs all incoming HTTP requests and outgoing responses
 * Includes: method, URL, status code, response time, user info
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Extract user info from JWT (if authenticated)
    const user = (request as any).user;
    const userId = user?.id || user?.sub || 'anonymous';

    // Log incoming request
    this.logger.log(
      `➡️  ${method} ${url} | User: ${userId} | IP: ${ip}`,
    );

    // Log request details in debug mode
    if (process.env.NODE_ENV !== 'production') {
      if (Object.keys(query).length > 0) {
        this.logger.debug(`   Query: ${JSON.stringify(query)}`);
      }
      if (Object.keys(params).length > 0) {
        this.logger.debug(`   Params: ${JSON.stringify(params)}`);
      }
      if (body && Object.keys(body).length > 0) {
        // Sanitize sensitive data
        const sanitizedBody = this.sanitizeBody(body);
        this.logger.debug(`   Body: ${JSON.stringify(sanitizedBody)}`);
      }
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;
          
          // Success log
          this.logger.log(
            `⬅️  ${method} ${url} | Status: ${statusCode} | ${responseTime}ms | User: ${userId}`,
          );

          // Log response body in debug mode (truncated)
          if (process.env.NODE_ENV !== 'production' && data) {
            const preview = JSON.stringify(data).substring(0, 200);
            this.logger.debug(`   Response: ${preview}${JSON.stringify(data).length > 200 ? '...' : ''}`);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          // Error log (detailed logging happens in exception filter)
          this.logger.error(
            `❌ ${method} ${url} | Status: ${statusCode} | ${responseTime}ms | User: ${userId}`,
          );
        },
      }),
    );
  }

  /**
   * Sanitize sensitive data from request body
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'passwordHash',
      'hashedPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
