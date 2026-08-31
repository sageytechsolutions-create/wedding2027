export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 401, 'Unauthorized access'),
  FORBIDDEN: new AppError('FORBIDDEN', 403, 'Forbidden'),
  NOT_FOUND: new AppError('NOT_FOUND', 404, 'Resource not found'),
  INVALID_REQUEST: new AppError('INVALID_REQUEST', 400, 'Invalid request'),
  CONFLICT: new AppError('CONFLICT', 409, 'Resource conflict'),
  INTERNAL_ERROR: new AppError('INTERNAL_ERROR', 500, 'Internal server error'),

  propertyNotFound: (id: string) =>
    new AppError('PROPERTY_NOT_FOUND', 404, `Property ${id} not found`),

  portfolioNotFound: (id: string) =>
    new AppError('PORTFOLIO_NOT_FOUND', 404, `Portfolio property ${id} not found`),

  userNotFound: (id: string) =>
    new AppError('USER_NOT_FOUND', 404, `User ${id} not found`),
};
