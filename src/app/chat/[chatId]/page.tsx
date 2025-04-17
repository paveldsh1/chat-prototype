"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import MessageItem from "@/components/MessageItem";
import ChatInput from "@/components/ChatInput";
import LoadingSpinner from "@/components/LoadingSpinner";

// Интерфейс для MediaItem, который соответствует типу в MessageItem
interface MediaItem {
  id: string | number;
  type: string;
  url?: string;
  isReady?: boolean;
  hasError?: boolean;
  files?: {
    full?: {
      url: string | null;
      width?: number;
      height?: number;
    };
    thumb?: {
      url: string | null;
    };
    preview?: {
      url: string | null;
    };
    squarePreview?: {
      url: string | null;
    };
  };
  canView?: boolean;
  duration?: number;
  videoSources?: {
    "720"?: string | null;
    "240"?: string | null;
  };
  mimetype?: string;
  filename?: string;
  size?: number;
}

interface Message {
  id: string;
  text: string;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | boolean; // добавлен boolean для совместимости с временными сообщениями
  mediaType?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  isFromUser?: boolean;
  price?: number;
  isFree?: boolean;
  isOpened?: boolean;
  error?: boolean;
  media?: MediaItem[];
}

interface PaginationData {
  next_id: string | null;
}

export default function ChatPage() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [messagePrice, setMessagePrice] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (loadMore: boolean = false, firstLoad: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Определяем лимит для первой загрузки или для подгрузки дополнительных сообщений
      const limit = firstLoad ? 50 : 20;
      
      // Определяем URL для запроса сообщений
      const url = loadMore && messages.length > 0
        ? `/api/onlyfans/chats/${chatId}/messages?limit=${limit}&beforeMessageId=${messages[messages.length - 1].id}`
        : `/api/onlyfans/chats/${chatId}/messages?limit=${limit}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Сортируем новые сообщения по дате создания (новые вверху)
      const sortedNewMessages = data.messages.sort((a: Message, b: Message) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Обновляем состояние сообщений в зависимости от типа загрузки
      setMessages(prev => {
        if (loadMore) {
          // При подгрузке добавляем новые сообщения в конец списка
          return [...prev, ...sortedNewMessages];
        } else {
          // При первичной загрузке заменяем весь список
          return sortedNewMessages;
        }
      });
      
      setNextId(data.pagination.next_id);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
      setLoading(false);
    }
  };

  const loadMoreMessages = () => {
    if (nextId && !loadingMore) {
      setLoadingMore(true);
      fetchMessages(true);
    }
  };

  useEffect(() => {
    if (!chatId) {
      setError("ID чата не указан");
      setLoading(false);
      return;
    }
    
    fetchMessages();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !files.length) || isSending) return;
    
    try {
      setSendingError(null);
      setIsSending(true);
      
      // Создаем временный ID для сообщения
      const tempId = `temp-${Date.now()}`;
      
      // Создаем временное сообщение для отображения
      const tempMessage: Message = {
        id: tempId,
        text: message,
        createdAt: new Date().toISOString(),
        fromUser: true,
        // Добавляем временные данные о медиа, если есть файлы
        media: files.map((file, index) => ({
          id: `temp-media-${index}`,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url: URL.createObjectURL(file),
          mimetype: file.type,
          filename: file.name,
          size: file.size,
        })),
      };
      
      // Добавляем временное сообщение в начало списка (так как новые сообщения отображаются вверху)
      setMessages(prev => [tempMessage, ...prev]);
      
      // Очищаем ввод и файлы
      setMessage('');
      setFiles([]);
      
      // Формируем FormData для отправки
      const formData = new FormData();
      formData.append('text', message);
      
      // Добавляем файлы, если они есть
      if (files.length) {
        files.forEach(file => {
          formData.append('files', file);
        });
        
        // Если установлена цена, добавляем ее
        if (messagePrice > 0) {
          formData.append('price', messagePrice.toString());
        }
      }
      
      // Отправляем запрос
      const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Используем текст ошибки из ответа, если он есть
        const errorText = await response.text();
        throw new Error(errorText || `Failed to send message: ${response.status}`);
      }
      
      // Парсим JSON-ответ
      const data = await response.json();
      
      // Заменяем временное сообщение в списке на реальное, полученное от сервера
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === tempId ? { ...data.message, fromUser: true } : msg
        );
        return updatedMessages;
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      setSendingError(error instanceof Error ? error.message : "Failed to send message");
      
      // Удаляем временное сообщение в случае ошибки
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    } finally {
      setIsSending(false);
      setMessagePrice(0);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">Ошибка: {error}</div>
      </div>
    );
  }

  // Отображаем сообщения так, чтобы новые были сверху (обратный порядок)
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Инпут для отправки сообщений размещаем сверху */}
      <div className="p-4 border-b bg-white">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isSending} 
        />
      </div>
      
      {/* Контейнер для сообщений */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            Нет сообщений
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Новые сообщения вверху */}
            {messages.map((message, index) => {
              // Определяем дату предыдущего сообщения (если оно есть)
              const previousMessage = index > 0 ? messages[index - 1] : undefined;
              return (
                <MessageItem 
                  key={message.id} 
                  message={message} 
                  previousMessageDate={previousMessage?.createdAt}
                />
              );
            })}
            
            {/* Кнопка загрузки старых сообщений в конце списка */}
            {nextId && (
              <div className="flex justify-center my-4">
                <button 
                  onClick={loadMoreMessages}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={loadingMore}
                >
                  {loadingMore ? "Загрузка..." : "Загрузить старые сообщения"}
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 