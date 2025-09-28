import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClientThemeProvider } from '@/components/client-theme-provider'
import { UserProvider } from '@/components/user-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'
import { auth0 } from "@/lib/auth0";

export const metadata: Metadata = {
  title: 'FireDash',
  description: 'FireDash',
  generator: 'FireDash',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth0.getSession();
  if (!session || !session.user) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
          `}</style>
        </head>
        <body suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ClientThemeProvider>
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    FireDash
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Your AI-powered finance analyst
                  </p>
                </div>
                
                <div className="space-y-4 rounded-lg bg-white p-8 shadow-xl dark:bg-slate-800">
                  <a 
                    href="/auth/login?screen_hint=signup"
                    className="block w-full rounded-md bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Create Account
                  </a>
                  
                  <a 
                    href="/auth/login"
                    className="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Sign In
                  </a>
                  
                  <div className="mt-6 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      By signing in, you agree to our terms of service and privacy policy
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Toaster />
          </ClientThemeProvider>
        </body>
      </html>
    );
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <UserProvider>
          <ClientThemeProvider>
            {children}
            <Toaster />
          </ClientThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}
