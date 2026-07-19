import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { platformAdmins } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to ensure only the primary owner/platform owner can perform certain actions
 * This middleware checks if the current user is marked as isPrimaryOwner in the platform_admins table
 */
export async function isPlatformOwnerOnly(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if not authenticated
    if (!req.isAuthenticated() && !req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to access this resource" });
    }

    // Get the current user's email - req.user is guaranteed to exist by the previous check
    // Using non-null assertion since we already checked req.user exists
    const userEmail = req.user!.email;
    
    if (!userEmail) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "User email not found. Platform owner verification requires an email address." 
      });
    }

    // Check if the user is a primary owner in the platform_admins table
    const [primaryOwner] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, userEmail));

    if (!primaryOwner || !primaryOwner.isPrimaryOwner) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Only the primary platform owner can perform this action." 
      });
    }

    // User is the primary owner, allow the request to proceed
    next();
  } catch (error) {
    console.error('Error in isPlatformOwnerOnly middleware:', error);
    return res.status(500).json({ 
      error: "Server Error", 
      message: "An error occurred while verifying platform owner status." 
    });
  }
}

/**
 * Middleware to ensure the user is any platform admin (primary or not)
 */
export async function isPlatformAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if not authenticated
    if (!req.isAuthenticated() && !req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to access this resource" });
    }

    // Get the current user's email - req.user is guaranteed to exist by the previous check
    // Using non-null assertion since we already checked req.user exists
    const userEmail = req.user!.email;
    
    if (!userEmail) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "User email not found. Platform admin verification requires an email address." 
      });
    }

    // Check if the user is in the platform_admins table
    const [admin] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, userEmail));

    if (!admin) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Only platform administrators can access this resource." 
      });
    }

    // Add admin info to the request for use in route handlers
    req.platformAdmin = admin;

    // User is a platform admin, allow the request to proceed
    next();
  } catch (error) {
    console.error('Error in isPlatformAdmin middleware:', error);
    return res.status(500).json({ 
      error: "Server Error", 
      message: "An error occurred while verifying platform admin status." 
    });
  }
}