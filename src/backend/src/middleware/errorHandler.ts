import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    const errorBody: any = {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    };

    if (process.env.NODE_ENV === 'development' && err.details) {
      errorBody.details = err.details;
    }

    res.status(err.statusCode).json({ error: errorBody });
    return;
  }

  if (err instanceof Error) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        statusCode: 500,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500,
    },
  });
};
