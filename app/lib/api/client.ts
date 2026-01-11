/**
 * API Client
 * Base fetch wrapper with auth and error handling
 */

import { useAuthStore } from '@/stores/auth-store';

/** API base URL from environment */
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/** API error structure */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: number;
    realtimeStatus?: 'fresh' | 'stale' | 'unavailable';
  };
}

/** Custom error class for API errors */
export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Request options */
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  requireAuth?: boolean;
}

/**
 * Make an API request
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, requireAuth = false, ...init } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  };
  
  // Add auth token if available
  const token = useAuthStore.getState().token;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new ApiRequestError('UNAUTHORIZED', 'Authentication required');
  }
  
  const url = `${API_URL}${endpoint}`;
  
  if (__DEV__) {
    console.log(`[API] ${init.method || 'GET'} ${endpoint}`);
  }
  
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const json: ApiResponse<T> = await response.json();
    
    if (!response.ok || !json.success) {
      throw new ApiRequestError(
        json.error?.code || 'REQUEST_FAILED',
        json.error?.message || 'Request failed',
        response.status,
        json.error?.details
      );
    }
    
    return json.data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    
    // Network or parsing error
    throw new ApiRequestError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/** GET request */
export function get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return request<T>(endpoint, { ...options, method: 'GET' });
}

/** POST request */
export function post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(endpoint, { ...options, method: 'POST', body });
}

/** PUT request */
export function put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(endpoint, { ...options, method: 'PUT', body });
}

/** DELETE request */
export function del<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return request<T>(endpoint, { ...options, method: 'DELETE' });
}

export const api = { get, post, put, del };
