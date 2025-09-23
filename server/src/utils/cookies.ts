export const cookieOptions = {
  httpOnly: true,
  secure: false, // Set to false for localhost development
  sameSite: 'lax' as const, // Changed from 'strict' to 'lax'
  maxAge: 60 * 60 * 24 * 7 * 1000,
  path: '/',
  domain: undefined, // Don't set domain for localhost
}
