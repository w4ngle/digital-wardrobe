export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET
  return request.headers.get('x-vercel-cron') === '1'
    || Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}
