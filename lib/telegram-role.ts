export type TelegramRole = 'owner' | 'partner' | null

export function telegramRoleForUser(userId: number | null, allowedIds: number[]): TelegramRole {
  if (!userId || !allowedIds.includes(userId)) return null
  return userId === allowedIds[0] ? 'owner' : 'partner'
}
