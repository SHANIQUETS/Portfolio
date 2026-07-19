
import { Request, Response, NextFunction } from 'express';

export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  // Skip check for login and password change endpoints
  if (req.path === '/api/login' || req.path === '/api/change-password') {
    return next();
  }

  // Check if user exists and needs password change
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      error: 'Password Change Required',
      message: 'You must change your password before continuing',
      requirePasswordChange: true
    });
  }

  next();
}
