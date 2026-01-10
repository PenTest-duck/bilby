/**
 * CORS configuration for mobile app access
 */

import cors, { type CorsOptions } from 'cors'
import { isDev } from '../lib/env.js'

const productionOrigins: string[] = [
  // Add production app origins here
]

const corsOptions: CorsOptions = {
  origin: isDev 
    ? true // Allow all origins in development
    : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || productionOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}

export const corsMiddleware = cors(corsOptions)
