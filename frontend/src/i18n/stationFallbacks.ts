export const STATION_FALLBACKS: Record<string, { name: Record<string, string>; address: Record<string, string> }> = {
  'station-001': {
    name: { en: 'Central Charging Hub', uk: 'Центральний хаб зарядки', ru: 'Центральный хаб зарядки', he: 'מרכז טעינה מרכזי' },
    address: { en: 'Main St, 123', uk: 'вул. Головна, 123', ru: 'ул. Главная, 123', he: 'רח\' הראשי 123' },
  },
  'station-002': {
    name: { en: 'Airport Fast Charge', uk: 'Аеропорт Швидка Зарядка', ru: 'Аэропорт Быстрая Зарядка', he: 'טעינה מהירה נמל תעופה' },
    address: { en: 'Airport Blvd, 456', uk: 'бульвар Аеропорт, 456', ru: 'бульвар Аэропорт, 456', he: 'שד\' נמל תעופה 456' },
  },
  'station-003': {
    name: { en: 'Park Charging Post', uk: 'Парковий зарядний пост', ru: 'Парковый зарядный пост', he: 'עמדת טעינה בפארק' },
    address: { en: 'Park Ave, 789', uk: 'пр-т Парковий, 789', ru: 'пр-т Парковый, 789', he: 'שד\' הפארק 789' },
  },
}
