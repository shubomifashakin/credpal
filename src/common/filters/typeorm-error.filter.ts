import { Response } from 'express';
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface PostgresError {
  code: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const pg = exception.driverError as unknown as PostgresError;

    if (pg.code === '23505') {
      return response.status(409).json({
        statusCode: 409,
        message: 'Resource already exists',
      });
    }

    if (pg.code === '23503') {
      return response.status(404).json({
        statusCode: 404,
        message: 'Related resource not found',
      });
    }

    if (pg.code === '23502') {
      return response.status(400).json({
        statusCode: 400,
        message: 'Missing required field',
      });
    }

    this.logger.error({
      message: exception.message,
      stack: exception.stack,
      code: pg.code,
      detail: pg.detail,
    });

    return response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
}
