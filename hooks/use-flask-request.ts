'use client'

import { useUser } from '@auth0/nextjs-auth0'
import { makeFlaskRequest } from '@/lib/config'

/**
 * Custom hook that provides Flask request functionality with automatic user ID injection
 * This ensures all Flask requests include the X-User-Id header as required by the server
 */
export function useFlaskRequest() {
  const { user } = useUser()
  
  const makeUserRequest = async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const userId = user?.sub // Auth0 user ID is stored in 'sub' field
    
    if (!userId) {
      throw new Error('User not authenticated - userId required for Flask requests')
    }
    
    return makeFlaskRequest(url, options, userId)
  }
  
  return {
    makeUserRequest,
    userId: user?.sub,
    isAuthenticated: !!user?.sub
  }
}
