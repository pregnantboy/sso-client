import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('client_session')

    if (sessionCookie) {
      const user = JSON.parse(sessionCookie.value)
      return NextResponse.json({ authenticated: true, user })
    }

    return NextResponse.json({ authenticated: false })
  } catch (error) {
    return NextResponse.json({ authenticated: false })
  }
}
