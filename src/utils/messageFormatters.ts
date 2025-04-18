import { Message } from '@/lib/onlyfans-api';

/**
 * Сортирует сообщения по времени создания (от старых к новым)
 */
export function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Удаляет дубликаты сообщений по ID
 */
export function removeDuplicateMessages(messages: Message[]): Message[] {
  const uniqueMessages = Array.from(
    new Map(messages.map(msg => [msg.id, msg])).values()
  );
  return uniqueMessages;
}

/**
 * Обрабатывает полученные сообщения и форматирует URL-адреса медиафайлов
 */
export function processMessagesMedia(messages: Message[]): Message[] {
  return messages.map(msg => ({
    ...msg,
    media: msg.media?.map(m => ({
      ...m,
      url: m.files?.full?.url || m.url || ''
    })) || []
  }));
}

/**
 * Группирует сообщения по дате (возвращает объект с датами в качестве ключей)
 */
export function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  return messages.reduce((acc, message) => {
    // Получаем дату сообщения без времени
    const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
    if (!acc[messageDate]) {
      acc[messageDate] = [];
    }
    acc[messageDate].push(message);
    return acc;
  }, {} as Record<string, Message[]>);
}

/**
 * Обрабатывает входящие сообщения, удаляя дубликаты и сортируя по времени
 */
export function processIncomingMessages(messages: Message[]): Message[] {
  const processed = processMessagesMedia(messages);
  const unique = removeDuplicateMessages(processed);
  return sortMessagesByTimestamp(unique);
}

/**
 * Форматирует дату для отображения в российском формате
 */
export function formatMessageDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
} 