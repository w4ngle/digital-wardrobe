export function moscowDate(value: Date | string = new Date()) {
  return new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}
