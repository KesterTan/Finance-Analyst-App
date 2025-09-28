'use client'

import { ReactNode } from 'react'
import { Auth0Provider } from '@auth0/nextjs-auth0'

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  return <Auth0Provider>{children}</Auth0Provider>
}
