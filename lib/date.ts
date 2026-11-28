export function moscowDate(value: Date | string = new Date()) {
  return new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

export function moscowDayStart(value: Date | string = new Date()) {
  return new Date(`${moscowDate(value)}T00:00:00+03:00`)
}
