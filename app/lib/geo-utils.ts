/**
 * Geo Utilities
 * 
 * Distance, bearing, and navigation calculations for journey tracking
 */

export interface Coordinate {
  latitude: number
  longitude: number
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = toRadians(from.latitude)
  const φ2 = toRadians(to.latitude)
  const Δφ = toRadians(to.latitude - from.latitude)
  const Δλ = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate bearing from one coordinate to another
 * @returns Bearing in degrees (0-360, where 0 = North)
 */
export function calculateBearing(from: Coordinate, to: Coordinate): number {
  const φ1 = toRadians(from.latitude)
  const φ2 = toRadians(to.latitude)
  const Δλ = toRadians(to.longitude - from.longitude)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)

  return (toDegrees(θ) + 360) % 360
}

/**
 * Convert bearing to compass direction
 */
export function bearingToDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

/**
 * Convert bearing to human-readable direction
 */
export function bearingToHumanDirection(bearing: number): string {
  const directions: Record<string, string> = {
    N: 'north',
    NE: 'northeast',
    E: 'east',
    SE: 'southeast',
    S: 'south',
    SW: 'southwest',
    W: 'west',
    NW: 'northwest',
  }
  return directions[bearingToDirection(bearing)]
}

/**
 * Estimate walking time based on distance
 * @param distanceMeters Distance in meters
 * @param walkingSpeedMps Walking speed in meters per second (default: 1.4 m/s ≈ 5 km/h)
 * @returns Time in seconds
 */
export function estimateWalkingTime(
  distanceMeters: number,
  walkingSpeedMps = 1.4
): number {
  return Math.ceil(distanceMeters / walkingSpeedMps)
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Check if user is near a coordinate
 */
export function isNearLocation(
  userLocation: Coordinate,
  target: Coordinate,
  thresholdMeters: number
): boolean {
  return calculateDistance(userLocation, target) <= thresholdMeters
}

/**
 * Find the closest point on a polyline to a given coordinate
 */
export function findClosestPointOnPath(
  userLocation: Coordinate,
  path: Coordinate[]
): { point: Coordinate; distance: number; segmentIndex: number } {
  let closestPoint = path[0]
  let minDistance = calculateDistance(userLocation, path[0])
  let segmentIndex = 0

  for (let i = 0; i < path.length - 1; i++) {
    const projected = projectPointOnSegment(userLocation, path[i], path[i + 1])
    const distance = calculateDistance(userLocation, projected)
    
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = projected
      segmentIndex = i
    }
  }

  return { point: closestPoint, distance: minDistance, segmentIndex }
}

/**
 * Project a point onto a line segment
 */
function projectPointOnSegment(
  point: Coordinate,
  segmentStart: Coordinate,
  segmentEnd: Coordinate
): Coordinate {
  const dx = segmentEnd.longitude - segmentStart.longitude
  const dy = segmentEnd.latitude - segmentStart.latitude
  
  if (dx === 0 && dy === 0) {
    return segmentStart
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.longitude - segmentStart.longitude) * dx +
        (point.latitude - segmentStart.latitude) * dy) /
        (dx * dx + dy * dy)
    )
  )

  return {
    latitude: segmentStart.latitude + t * dy,
    longitude: segmentStart.longitude + t * dx,
  }
}

/**
 * Calculate remaining distance along a path from a given index
 */
export function calculateRemainingDistance(
  path: Coordinate[],
  fromIndex: number,
  currentPosition?: Coordinate
): number {
  let distance = 0
  
  // Add distance from current position to next point if provided
  if (currentPosition && fromIndex < path.length) {
    distance += calculateDistance(currentPosition, path[fromIndex])
  }
  
  // Sum distances between remaining points
  for (let i = fromIndex; i < path.length - 1; i++) {
    distance += calculateDistance(path[i], path[i + 1])
  }
  
  return distance
}

/**
 * Detect if user is likely on a vehicle based on speed
 * @param speedMps Speed in meters per second
 * @returns true if speed suggests transit (> 8 m/s ≈ 29 km/h)
 */
export function isTransitSpeed(speedMps: number): boolean {
  return speedMps > 8
}

/**
 * Detect if user is walking based on speed
 * @param speedMps Speed in meters per second
 * @returns true if speed suggests walking (0.5 - 3 m/s)
 */
export function isWalkingSpeed(speedMps: number): boolean {
  return speedMps >= 0.5 && speedMps <= 3
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
