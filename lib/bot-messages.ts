export const appUrl = 'https://digital-wardrobe-gilt.vercel.app/'

export const welcomeMessage = `Вот, любимая, это подарок тебе на Новый год 🎁

Я сделал для тебя личный цифровой гардероб. Здесь можно хранить вещи, собирать образы и быстро решать, что надеть.

Нажимай кнопку ниже — всё уже готово для тебя 🤍`

export const helpMessage = `Солнышко, это твой личный гардероб ✨

Добавляй вещи, собирай и сохраняй образы, отмечай любимое и планируй, что надеть.`

export function botReply(text = '') {
  return text.startsWith('/start') ? welcomeMessage : helpMessage
}
