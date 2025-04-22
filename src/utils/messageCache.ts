import { Message } from '@/lib/onlyfans-api';
import { sortMessagesByTimestamp } from './messageFormatters';

/**
 * Обновляет кэш сообщений, добавляя новые сообщения и удаляя дубликаты
 */
export function updateMessageCache(
  cache: Record<string, Message[]>,
  chatId: string,
  newMessages: Message[]
): Record<string, Message[]> {
  const currentMessages = cache[chatId] || [];
  
  // Создаем Map из кэшированных сообщений
  const messagesMap = new Map(currentMessages.map(msg => [msg.id, msg]));
  
  // Добавляем новые сообщения в Map
  newMessages.forEach(msg => {
    messagesMap.set(msg.id, msg);
  });
  
  // Преобразуем Map обратно в массив и сортируем
  const uniqueMessages = Array.from(messagesMap.values());
  const sortedMessages = sortMessagesByTimestamp(uniqueMessages);
  
  return {
    ...cache,
    [chatId]: sortedMessages
  };
}

/**
 * Заменяет временное сообщение реальным в кэше
 */
export function replaceTemporaryMessage(
  cache: Record<string, Message[]>,
  chatId: string,
  tempId: number,
  realMessage: Message
): Record<string, Message[]> {
  const chatMessages = cache[chatId] || [];
  
  const updatedMessages = chatMessages.map(msg => 
    msg.id === tempId ? realMessage : msg
  );
  
  return {
    ...cache,
    [chatId]: updatedMessages
  };
}

/**
 * Удаляет сообщение из кэша
 */
export function removeMessageFromCache(
  cache: Record<string, Message[]>,
  chatId: string,
  messageId: number
): Record<string, Message[]> {
  const chatMessages = cache[chatId] || [];
  
  return {
    ...cache,
    [chatId]: chatMessages.filter(msg => msg.id !== messageId)
  };
}

/**
 * Добавляет оптимистичное сообщение в кэш
 */
export function addOptimisticMessage(
  cache: Record<string, Message[]>,
  chatId: string,
  message: Message
): Record<string, Message[]> {
  const chatMessages = cache[chatId] || [];
  
  return {
    ...cache,
    [chatId]: [...chatMessages, message]
  };
} 