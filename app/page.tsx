'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authMethod, setAuthMethod] = useState<'silent' | 'redirect' | null>(
    null
  )
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const response = await fetch('/api/session')
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          setUser(data.user)
          setLoading(false)
          return
        }
      }
      // No existing session, try silent auth
      trySilentAuth()
    } catch (err) {
      console.error('Session check failed:', err)
      setLoading(false)
    }
  }

  const trySilentAuth = () => {
    setAuthMethod('silent')

    // Set up postMessage listener
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== process.env.NEXT_PUBLIC_SSO_URL) return
      if (event.data.type === 'SSO_AUTH_SUCCESS') {
        console.log('SSO_AUTH_SUCCESS')
        clearTimeout(timeoutRef.current)
        window.removeEventListener('message', handleMessage)
        exchangeCodeForToken(event.data.code, 'silent')
      } else if (event.data.type === 'SSO_AUTH_FAILED') {
        clearTimeout(timeoutRef.current)
        console.log('SSO_AUTH_FAILED')
        window.removeEventListener('message', handleMessage)
        // fallbackToRedirect()
      }
    }

    window.addEventListener('message', handleMessage)

    // Set timeout for fallback
    timeoutRef.current = setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      fallbackToRedirect()
    }, 3000)

    // Create hidden iframe for silent auth
    const iframe = document.createElement('iframe')
    iframe.style.display = 'block'
    iframe.style.position = 'absolute'
    iframe.style.top = '0'
    iframe.style.left = '0'
    iframe.style.height = '100px'
    iframe.style.width = '100px'
    iframe.src = `${
      process.env.NEXT_PUBLIC_SSO_URL
    }/api/sso/silent-auth?client_id=clientA&redirect_uri=${encodeURIComponent(
      `${window.location.origin}/api/iframe-callback`
    )}`
    document.body.appendChild(iframe)

    // Clean up iframe after timeout
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 5000)
  }

  const fallbackToRedirect = () => {
    setAuthMethod('redirect')
    setError('Silent authentication failed, falling back to redirect...')

    setTimeout(() => {
      const clientId = 'clientA'
      const redirectUri = encodeURIComponent(`${window.location.origin}/`)
      const state = Math.random().toString(36).substring(7)

      window.location.href = `${process.env.NEXT_PUBLIC_SSO_URL}/sso/login?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
    }, 1500)
  }

  const exchangeCodeForToken = async (
    code: string,
    method: 'silent' | 'redirect'
  ) => {
    try {
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      console.log(response)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setAuthMethod(method)
        setError('')
        // Clean up URL if redirect method
        if (method === 'redirect') {
          window.history.replaceState({}, '', '/')
        }
      } else {
        setError('Authentication failed')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleManualLogin = () => {
    const clientId = 'clientA'
    const redirectUri = encodeURIComponent(`${window.location.origin}/`)
    const state = Math.random().toString(36).substring(7)

    window.location.href = `${process.env.NEXT_PUBLIC_SSO_URL}/sso/login?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      setUser(null)
      setAuthMethod(null)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Handle redirect callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code && !user) {
      exchangeCodeForToken(code, 'redirect')
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <div>
                <p className="font-semibold">Authenticating...</p>
                {authMethod === 'silent' && (
                  <p className="text-sm text-gray-600">
                    Trying silent authentication
                  </p>
                )}
                {authMethod === 'redirect' && (
                  <p className="text-sm text-gray-600">
                    Redirecting to SSO server
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              🔧 Client A<Badge variant="outline">Silent Auth + Fallback</Badge>
            </h1>
            <p className="text-gray-600">
              Government workflow automation with hybrid SSO
            </p>
          </div>
          {user && (
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          )}
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!user ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Welcome to Client A</CardTitle>
              <CardDescription>
                Hybrid authentication in progress...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Authentication Strategy:</strong>
                    <br />
                    1. Try silent authentication (iframe)
                    <br />
                    2. Fallback to redirect if needed
                  </p>
                </div>
                <Button
                  onClick={handleManualLogin}
                  className="w-full"
                  variant="outline"
                >
                  Manual Login (Skip Silent Auth)
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Welcome back, {user.name}!
                  <Badge variant="secondary">
                    {authMethod === 'silent' ? 'Silent Auth' : 'Redirect Auth'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  You are now logged in to Client A via{' '}
                  {authMethod === 'silent' ? 'silent' : 'redirect'}{' '}
                  authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Authentication Method:</strong>{' '}
                    {authMethod === 'silent'
                      ? 'Silent (iframe-based)'
                      : 'Redirect-based'}
                  </p>
                  <p>
                    <strong>Session Status:</strong> Active
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Method Used:</strong>{' '}
                    {authMethod === 'silent'
                      ? 'Silent Authentication (iframe + postMessage)'
                      : 'Redirect-based SSO'}
                  </p>
                  <p>
                    <strong>Fallback Available:</strong> Yes
                  </p>
                  <p>
                    <strong>Browser Compatibility:</strong>{' '}
                    {authMethod === 'silent'
                      ? 'Modern browsers with 3rd-party cookies enabled'
                      : 'All browsers'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
