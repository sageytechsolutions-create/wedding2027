import { Request, Response, NextFunction } from 'express';
import { Errors } from '../utils/errors.js';
import { supabase } from '../config/supabase.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw Errors.UNAUTHORIZED;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw Errors.UNAUTHORIZED;
    }

    req.userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      if (data.user) {
        req.userId = data.user.id;
      }
    }
    next();
  } catch {
    next();
  }
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// Alias for backwards compatibility
export const verifyAuth = requireAuth;
