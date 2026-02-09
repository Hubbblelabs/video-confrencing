import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global Exception Filter
 * 
 * Catches all exceptions and formats error responses
 * Logs errors with stack traces for debugging
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, stack } = this.parseException(exception);

    // Extract user info
    const user = (request as any).user;
    const userId = user?.id || user?.sub || 'anonymous';

    // Log the error
    this.logError(request, status, message, error, stack, userId);

    // Send error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV !== 'production' && stack ? { stack } : {}),
    });
  }

  /**
   * Parse exception to extract status, message, and error type
   */
  private parseException(exception: unknown): {
    status: number;
    message: string;
    error: string;
    stack?: string;
  } {
    // HTTP Exception (from NestJS)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message: string;
      let error: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }

      return {
        status,
        message: Array.isArray(message) ? message.join(', ') : message,
        error,
        stack: exception.stack,
      };
    }

    // Prisma Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
        error: 'ValidationError',
        stack: exception.stack,
      };
    }

    // Generic Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        error: exception.name || 'InternalServerError',
        stack: exception.stack,
      };
    }

    // Unknown exception
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'UnknownError',
      stack: undefined,
    };
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
    stack?: string;
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target?.join(', ') || 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${field} already exists`,
          error: 'UniqueConstraintViolation',
          stack: error.stack,
        };

      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Cannot perform this operation due to related records',
          error: 'ForeignKeyConstraintViolation',
          stack: error.stack,
        };

      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFound',
          stack: error.stack,
        };

      case 'P2016': // Record to delete does not exist
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record to delete does not exist',
          error: 'NotFound',
          stack: error.stack,
        };

      case 'P2021': // Table does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database table does not exist',
          error: 'DatabaseError',
          stack: error.stack,
        };

      case 'P2022': // Column does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database column does not exist',
          error: 'DatabaseError',
          stack: error.stack,
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          error: 'DatabaseError',
          stack: error.stack,
        };
    }
  }

  /**
   * Log error details
   */
  private logError(
    request: Request,
    status: number,
    message: string,
    error: string,
    stack: string | undefined,
    userId: string,
  ) {
    const { method, url, body, query, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    // Error log with context
    this.logger.error(
      `🔥 ${error} | ${method} ${url} | Status: ${status} | User: ${userId} | IP: ${ip}`,
    );
    this.logger.error(`   Message: ${message}`);

    // Log request details in non-production
    if (process.env.NODE_ENV !== 'production') {
      if (Object.keys(query).length > 0) {
        this.logger.error(`   Query: ${JSON.stringify(query)}`);
      }
      if (body && Object.keys(body).length > 0) {
        const sanitized = this.sanitizeBody(body);
        this.logger.error(`   Body: ${JSON.stringify(sanitized)}`);
      }
      this.logger.error(`   User-Agent: ${userAgent}`);
    }

    // Log stack trace for 5xx errors
    if (status >= 500 && stack) {
      this.logger.error(`   Stack: ${stack}`);
    }
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
