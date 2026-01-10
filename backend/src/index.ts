/**
 * Bilby Backend - Express Application
 * Main entry point for Vercel serverless deployment
 */

import express, { type Express } from 'express'
import { corsMiddleware } from './middleware/cors.js'
import { requestLogger } from './middleware/request-logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { NotFoundError } from './lib/errors.js'
import apiRouter from './api/index.js'

const app: Express = express()

// Trust proxy (for correct client IP behind Vercel)
app.set('trust proxy', true)

// Middleware stack
app.use(corsMiddleware)
app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)

// API routes
app.use('/api', apiRouter)

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Bilby API',
    version: '1.0.0',
    docs: '/api/health'
  })
})

// 404 handler for unknown routes
app.use((_req, _res, next) => {
  next(new NotFoundError('Endpoint not found'))
})

// Global error handler (must be last)
app.use(errorHandler)

export default app
