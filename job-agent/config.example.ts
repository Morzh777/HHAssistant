// HeadHunter OAuth Configuration
// Скопируйте этот файл в config.ts и заполните реальными данными

export const hhConfig = {
  clientId: 'your_client_id_here',
  clientSecret: 'your_client_secret_here',
  redirectUri: 'http://localhost:3000/auth/callback',
  scope: 'basic',
  port: 3000,
};

// Пример использования:
// 1. Получите client_id и client_secret на https://hh.ru/oauth/
// 2. Замените 'your_client_id_here' и 'your_client_secret_here' на реальные значения
// 3. Убедитесь, что redirectUri совпадает с указанным при регистрации приложения
