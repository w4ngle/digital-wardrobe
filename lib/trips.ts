export const TRIP_TYPES = ['Море', 'Горы', 'Городская поездка', 'Отдых', 'Соревнования', 'Сборы', 'Короткая поездка'] as const

export function tripPreset(type: string) {
  if (type === 'Море') return { beach: true, training: false, laundry: false, baggage: 'Чемодан', style: 'Пляжный' }
  if (type === 'Горы') return { beach: false, training: false, laundry: false, baggage: 'Чемодан', style: 'Спортивный' }
  if (type === 'Соревнования') return { beach: false, training: true, laundry: false, baggage: 'Чемодан', style: 'Спортивный' }
  if (type === 'Сборы') return { beach: false, training: true, laundry: true, baggage: 'Чемодан', style: 'Спортивный' }
  return { beach: false, training: false, laundry: false, baggage: 'Ручная кладь', style: 'Повседневный' }
}
