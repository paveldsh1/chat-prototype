# Tech Context - OnlyFans Chat

## Используемые технологии

### Основной стек
- **Next.js** (v15.3.0) - фреймворк для React с поддержкой серверного рендеринга
- **React** (v19.0.0) - библиотека для построения пользовательских интерфейсов
- **TypeScript** (v5) - типизированный JavaScript для повышения надежности кода
- **Tailwind CSS** (v4) - утилитарный CSS-фреймворк для стилизации

### UI библиотеки и компоненты
- **Radix UI** - набор доступных, ненавязчивых компонентов UI
  - @radix-ui/react-avatar
  - @radix-ui/react-scroll-area
  - @radix-ui/react-separator
  - @radix-ui/react-slot
- **Heroicons** (v2.2.0) - набор SVG иконок
- **Lucide React** (v0.488.0) - библиотека иконок для React
- **class-variance-authority** (v0.7.1) - утилита для создания вариантов компонентов
- **clsx** (v2.1.1) - утилита для условной сборки имен классов
- **tailwind-merge** (v3.2.0) - умное соединение классов Tailwind
- **tw-animate-css** (v1.2.5) - анимации для Tailwind

### Инструменты разработки
- **ESLint** (v9) - линтер для JavaScript/TypeScript
- **eslint-config-next** - конфигурация ESLint для Next.js
- **Турбопак** - используется в режиме разработки (--turbopack)

## Техническая настройка

### Scripts
- `npm run dev` - запуск в режиме разработки с Турбопаком
- `npm run build` - сборка приложения
- `npm run start` - запуск собранного приложения
- `npm run lint` - запуск линтера

### Конфигурация проекта
Проект использует следующие конфигурационные файлы:
- `tsconfig.json` - настройки TypeScript
- `next.config.ts` - настройки Next.js
- `postcss.config.mjs` - настройки PostCSS
- `eslint.config.mjs` - настройки ESLint
- `components.json` - конфигурация UI компонентов

## Технические ограничения

1. **Зависимость от клиентского JavaScript**
   - Приложение сильно зависит от клиентского JavaScript
   - Необходимо учитывать доступность для пользователей с отключенным JavaScript

2. **Производительность**
   - Виртуализация списков необходима для эффективного отображения длинной истории сообщений
   - Оптимизация загрузки медиафайлов и превью

3. **Типизация**
   - Необходимо тщательное поддержание типов TypeScript для всех компонентов и хуков
   - Особое внимание к типизации данных API

4. **Масштабируемость**
   - Архитектура должна поддерживать растущее количество функций
   - Оптимизация для обработки большого количества чатов и сообщений

## Зависимости

### Прямые зависимости
```json
{
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slot": "^1.2.0",
    "@vercel/og": "^0.6.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.488.0",
    "next": "15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.2.0",
    "tw-animate-css": "^1.2.5"
  }
}
```

### Инструменты разработки
```json
{
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.3.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
``` 