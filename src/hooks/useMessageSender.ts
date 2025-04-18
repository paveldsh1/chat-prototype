import { useState } from 'react';
import { Message } from '@/lib/onlyfans-api';
import { sendMessage } from '@/lib/onlyfans-api';

interface UseMessageSenderProps {
  selectedChat: number | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messageCache: Record<string, Message[]>;
  setMessageCache: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  isUpdatingRef: React.MutableRefObject<boolean>;
}

export default function useMessageSender({
  selectedChat, 
  messages,
  setMessages,
  messageCache,
  setMessageCache,
  isUpdatingRef
}: UseMessageSenderProps) {
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendTextMessage = async (messagesContainerRef?: React.RefObject<HTMLDivElement>) => {
    if (!selectedChat || !newMessage.trim()) return;
    
    // Временно отключаем автоматическое обновление сообщений
    isUpdatingRef.current = true;

    // Создаем оптимистичное сообщение с уникальным временным ID
    const tempId = Date.now(); // Используем числовой ID, как ожидает тип Message
    
    const optimisticMessage: Message = {
      id: tempId, // Временный ID, который точно не будет дублировать реальные ID сообщений
      text: newMessage,
      timestamp: new Date().toISOString(),
      fromUser: true,
      media: [],
      isFree: true,
      price: 0,
      isNew: true
    };

    // Очищаем поле ввода сразу
    const messageText = newMessage;
    setNewMessage('');

    // Получаем ID чата в виде строки для использования в кэше
    const chatIdStr = selectedChat.toString();

    // Оптимистично обновляем UI
    setMessages(prev => [...prev, optimisticMessage]);

    // Обновляем кэш сообщений
    setMessageCache(prev => {
      const chatMessages = prev[chatIdStr] || [];
      return {
        ...prev,
        [chatIdStr]: [...chatMessages, optimisticMessage]
      };
    });

    try {
      setError(null);
      
      // Прокручиваем чат вниз после создания оптимистичного сообщения
      if (messagesContainerRef?.current) {
        setTimeout(() => {
          messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
      
      // Отправляем сообщение на сервер
      const message = await sendMessage(chatIdStr, messageText);
      
      // Обработка медиа в полученном сообщении
      const processedMessage = {
        ...message,
        media: message.media?.map(m => ({
          ...m,
          url: m.files?.full?.url || m.url || ''
        })) || []
      };
      
      // Заменяем оптимистичное сообщение реальным в UI
      setMessages(prev => {
        // Создаем Map из текущих сообщений для дедупликации
        const messagesMap = new Map(prev.map(msg => [msg.id, msg]));
        
        // Удаляем оптимистичное сообщение
        messagesMap.delete(tempId);
        
        // Добавляем реальное сообщение
        messagesMap.set(processedMessage.id, processedMessage);
        
        // Преобразуем Map обратно в массив и сортируем
        const uniqueMessages = Array.from(messagesMap.values());
        return uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      
      // Обновляем кэш сообщений
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        
        // Создаем Map из кэшированных сообщений
        const messagesMap = new Map(chatMessages.map(msg => [msg.id, msg]));
        
        // Удаляем оптимистичное сообщение и добавляем реальное
        messagesMap.delete(tempId);
        messagesMap.set(processedMessage.id, processedMessage);
        
        // Преобразуем Map обратно в массив и сортируем
        const uniqueMessages = Array.from(messagesMap.values());
        const sortedMessages = uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return {
          ...prev,
          [chatIdStr]: sortedMessages
        };
      });
    } catch (error) {
      // В случае ошибки удаляем оптимистичное сообщение
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        return {
          ...prev,
          [chatIdStr]: chatMessages.filter(msg => msg.id !== tempId)
        };
      });
      setError(error instanceof Error ? error.message : 'Failed to send message');
      console.error('Failed to send message:', error);
    } finally {
      // Возобновляем автоматическое обновление сообщений
      isUpdatingRef.current = false;
    }
  };

  return {
    newMessage,
    setNewMessage,
    error,
    setError,
    sendTextMessage
  };
} 