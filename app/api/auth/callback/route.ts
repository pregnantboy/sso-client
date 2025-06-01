import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    // Exchange code for token with SSO server
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SSO_URL}/api/sso/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: 'clientA',
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        }),
      }
    )

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()

    // Set local session cookie
    const cookieStore = await cookies()
    cookieStore.set('plumber_session', JSON.stringify(tokenData.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return NextResponse.json({ success: true, user: tokenData.user })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
