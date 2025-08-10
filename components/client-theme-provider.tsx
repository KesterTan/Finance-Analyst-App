'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/theme-provider'

interface ClientThemeProviderProps {
  children: React.ReactNode
}

export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
