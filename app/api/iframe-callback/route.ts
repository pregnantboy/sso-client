import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Silent Auth Callback</title></head>
      <body>
        <script>
          window.parent.postMessage({
            type: 'SSO_AUTH_FAILED',
            error: '${error}'
          }, '*');
        </script>
      </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  if (code) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Silent Auth Callback</title></head>
      <body>
        <script>
          window.parent.postMessage({
            type: 'SSO_AUTH_SUCCESS',
            code: '${code}'
          }, '${process.env.NEXT_PUBLIC_APP_URL}');
        </script>
      </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  return new NextResponse('Invalid callback', { status: 400 })
}
