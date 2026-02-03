# OnlyFans Chat Prototype — Next.js BFF

Пэт‑проект: веб‑клиент для чтения и отправки сообщений OnlyFans через server‑side прокси (BFF). Фокус — архитектура интеграции внешнего API, обработка медиа, пагинация и устойчивость.

---

## Возможности
- Список чатов и история сообщений с пагинацией `next_id`
- Отправка текста и медиа (двухэтапная загрузка)
- Оптимистичные обновления UI + обработка ошибок
- Локальный кэш сообщений и дедупликация
- Прокси медиа с кэшированием, таймаутами и ретраями
- UI на основе Radix/shadcn + Tailwind

## Demo
![Demo](docs/demo.gif)

## Архитектура
```mermaid
flowchart LR
  UI["Browser UI (Next.js App Router)"]
  BFF["Next.js API routes (BFF/Proxy)"]
  OF["OnlyFans API"]
  Media["Media CDN"]
  Proxy["/api/proxy-image\n(cache+retry)"]

  UI -- GET /api/onlyfans/chats --> BFF
  UI -- GET/POST /api/onlyfans/chats/:id/messages --> BFF
  UI -- GET /api/onlyfans/me --> BFF
  BFF -- HTTP --> OF
  UI -. "optional: /api/proxy-image?url=..." .-> Proxy
  Proxy -- HTTP --> Media
```

## Архитектура и модули
- `src/app/page.tsx` — orchestrator: авторизация, загрузка чатов, кэш сообщений, пагинация, оптимистичная отправка.
- `src/app/chat/[chatId]/page.tsx` — отдельный экран чата с инпутом и кнопкой загрузки старых сообщений.
- `src/app/model/auth/page.tsx` — UI авторизации модели с polling статуса.
- `src/app/api/onlyfans/[...path]/route.ts` — универсальный прокси к внешнему API, плюс `GET /me` и stub `authenticate`.
- `src/app/api/onlyfans/chats/[chatId]/messages/route.ts` — серверная логика сообщений и медиа: upload → media_id → send-message.
- `src/app/api/proxy-image/route.ts` — проксирование изображений с кэшем, таймаутом и ретраями.
- `src/lib/onlyfans-api.ts` — клиентский слой и DTO (типизация, маппинг, нормализация).
- `src/lib/api-utils.ts` — обработка HTTP‑ответов и ошибок.
- `src/components/*` — UI‑компоненты (`MessageItem`, `ChatInput`, `LoadingSpinner`).
- `src/components/ui/*` — базовые primitives (Radix/shadcn).

## Работа с API и логикой данных
- `GET /api/onlyfans/chats` → список чатов, маппинг фан‑данных в `Chat`.
- `GET /api/onlyfans/chats/:id/messages?limit=&next_id=` → история сообщений + cursor pagination.
- `POST /api/onlyfans/chats/:id/messages`:
  - `multipart/form-data`: загрузка файла в `/medias`, получение `media_id`, отправка сообщения в `/chats/send-message`.
  - `application/json`: текстовое сообщение без медиа.
- Кэш сообщений по `chatId` + дедупликация по `id`, сортировка по времени.
- Оптимистичное добавление сообщения и последующая замена на подтверждённые данные.
- Фолбэк на mock‑данные при ошибках внешнего API (устойчивость UI).

## Используемые паттерны и приёмы
- Backend‑for‑Frontend / API Gateway: серверные маршруты скрывают ключи и нормализуют внешний API.
- Adapter / Mapper: преобразование ответов внешнего API в `Chat` / `Message`.
- Cache‑aside: in‑memory кэш изображений в `/api/proxy-image`, клиентский кэш сообщений.
- Retry with backoff + timeout: устойчивость при загрузке медиа.
- Optimistic UI: мгновенное отображение сообщения до ответа сервера.
- Cursor pagination: загрузка истории по `next_id`.

## Backend‑ориентированный опыт
- Построил BFF слой на Next.js API routes для интеграции внешнего сервиса.
- Реализовал двухэтапную отправку медиа (upload → message).
- Спроектировал пагинацию и кэш сообщений для уменьшения числа запросов.
- Добавил устойчивость к сбоям (ретраи, таймауты, mock fallback).
- Проработал обработку ошибок и состояния загрузки в UI.

## Надёжность и производительность
- Таймаут и ограниченное число повторов для внешних запросов медиа.
- Кэширование изображений на 24 часа для снижения нагрузки.
- Дедупликация сообщений по `id` при подгрузке истории.
- Локальная сортировка сообщений для предсказуемого рендера.

## Поток отправки сообщения с медиа
```mermaid
sequenceDiagram
  participant UI as Browser UI
  participant BFF as Next.js API
  participant OF as OnlyFans API

  UI->>BFF: POST /api/onlyfans/chats/:id/messages (multipart)
  BFF->>OF: POST /medias (upload file)
  OF-->>BFF: media_id
  BFF->>OF: POST /chats/send-message (text + media_id)
  OF-->>BFF: message payload
  BFF-->>UI: message JSON
```

## Структура проекта
```
src/
  app/
    api/
      onlyfans/[...path]/route.ts
      onlyfans/chats/[chatId]/messages/route.ts
      proxy-image/route.ts
    chat/[chatId]/page.tsx
    model/auth/page.tsx
    page.tsx
  components/
  lib/
docs/demo.gif
```

## Запуск
1. `npm install`
2. `npm run dev`
3. Открыть `http://localhost:3000`

## Идеи для развития
- Вынести API‑ключи в `.env` и добавить типизированную конфигурацию.
- Добавить rate limiting и audit‑логирование для API‑маршрутов.
- Персистентный кэш (Redis) для изображений и истории сообщений.
- Набор e2e‑тестов для сценариев отправки медиа.
