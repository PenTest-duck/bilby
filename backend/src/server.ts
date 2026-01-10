/**
 * Development server entry point
 * Used for local testing with tsx
 */

import app from './index.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`🚀 Bilby API running at http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})
