/**
 * Global error handler middleware
 * Ensures all errors return JSON responses
 */

import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors.js'
import { isDev } from '../lib/env.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (isDev) {
    console.error('[Error]', err.stack || err.message)
  } else {
    console.error('[Error]', err.message)
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(isDev && err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  // Handle unknown errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
      ...(isDev ? { stack: err.stack } : {}),
    },
  })
}
