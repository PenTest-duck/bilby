/**
 * Request logging middleware
 * Logs method, path, status, and response time
 */

import type { Request, Response, NextFunction } from 'express'

const SKIP_PATHS = ['/api/health']

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging for noisy endpoints
  if (SKIP_PATHS.includes(req.path)) {
    next()
    return
  }

  const start = performance.now()

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start)
    const timestamp = new Date().toISOString()
    console.log(
      `[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    )
  })

  next()
}
