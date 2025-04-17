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
  };
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
  isFromUser: boolean;
  price: number;
  isFree: boolean;
  isOpened: boolean;
  error?: boolean;
  media?: MediaItem[];
}

interface ApiMessage {
  id: string;
  text: string;
  createdAt: string;
  fromUser: boolean | {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  mediaType?: string | null;
  mediaUrl?: string | null;
  price?: number;
  isFree?: boolean;
  isOpened?: boolean;
  media?: MediaItem[];
  error?: boolean;
}

export default function ChatPage() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Функция для преобразования ApiMessage в Message
  const convertToMessage = (apiMessage: ApiMessage): Message => {
    // Если fromUser это boolean - создаем объект для совместимости
    const fromUser = typeof apiMessage.fromUser === "boolean" 
      ? {
          id: "you",
          name: "Вы",
          username: "you",
          avatar: null
        }
      : apiMessage.fromUser;

    return {
      id: apiMessage.id,
      text: apiMessage.text,
      fromUser: fromUser,
      mediaType: apiMessage.mediaType || null,
      mediaUrl: apiMessage.mediaUrl || null,
      createdAt: apiMessage.createdAt,
      isFromUser: typeof apiMessage.fromUser === "boolean" ? true : false,
      price: apiMessage.price || 0,
      isFree: apiMessage.isFree !== undefined ? apiMessage.isFree : true,
      isOpened: apiMessage.isOpened !== undefined ? apiMessage.isOpened : true,
      error: apiMessage.error,
      media: apiMessage.media
    };
  };

  const fetchMessages = async (lastMessageId?: string) => {
    try {
      // Формируем URL с учетом пагинации
      let url = `/api/onlyfans/chats/${chatId}/messages?limit=${lastMessageId ? '20' : '50'}`;
      if (lastMessageId) {
        url += `&id=${lastMessageId}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Не удалось загрузить сообщения");
      }
      
      const data = await response.json();
      
      if (lastMessageId) {
        // Добавляем старые сообщения в конец списка
        const convertedMessages = data.messages.map(convertToMessage);
        setMessages(prev => [...prev, ...convertedMessages]);
      } else {
        // Сначала показываем новые сообщения (обратный порядок)
        const sortedMessages = [...data.messages]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(convertToMessage);
        
        setMessages(sortedMessages);
      }
      
      setNextId(data.pagination.next_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (nextId && !loadingMore) {
      setLoadingMore(true);
      fetchMessages(nextId);
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

  const handleSendMessage = async (text: string, file?: File, price: number = 0) => {
    try {
      if ((!text.trim() && !file) || isSending) return;
      
      setIsSending(true);
      
      // Создаем временный ID для сообщения
      const tempId = `temp-${Date.now()}`;
      
      // Подготавливаем новое сообщение для отображения
      const newMessage: Message = {
        id: tempId,
        text: text,
        fromUser: {
          id: 'you',
          name: 'Вы',
          username: 'you',
          avatar: null
        },
        mediaType: file ? (file.type.includes('image') ? 'photo' : 'video') : null,
        mediaUrl: file ? URL.createObjectURL(file) : null,
        createdAt: new Date().toISOString(),
        isFromUser: true,
        price: price,
        isFree: price === 0,
        isOpened: true
      };
      
      // Добавляем временное сообщение в начало списка (новые сообщения вверху)
      setMessages(prev => [newMessage, ...prev]);
      
      // Отправляем сообщение на сервер
      let formData = new FormData();
      formData.append('text', text);
      
      if (file) {
        formData.append('file', file);
        
        // Добавляем цену, если файл платный
        if (price > 0) {
          formData.append('price', price.toString());
        }
      }
      
      const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
        method: 'POST',
        body: file ? formData : JSON.stringify({ text }),
        headers: file ? undefined : {
          'Content-Type': 'application/json'
        }
      });
      
      // Читаем ответ в текстовом формате
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Ошибка при парсинге JSON ответа:', jsonError);
        throw new Error('Неверный формат ответа от сервера');
      }
      
      if (!response.ok) {
        // Помечаем временное сообщение как ошибочное
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...msg,
            text: msg.text + ' (Ошибка при отправке)',
            error: true
          } : msg
        ));
        
        // Показываем ошибку
        setError(data.message || data.error || `Не удалось отправить сообщение: ${response.status}`);
        
        // Убираем ошибку через 5 секунд
        setTimeout(() => setError(null), 5000);
        
        throw new Error(data.message || data.error || `Не удалось отправить сообщение: ${response.status}`);
      }
      
      // Заменяем временное сообщение на реальное с сервера
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? {
          ...msg,
          id: data.data.id.toString(),
          createdAt: data.data.createdAt,
          price: data.data.price || price,
          isFree: data.data.isFree !== undefined ? data.data.isFree : price === 0,
          media: data.data.media || []
        } : msg
      ));
      
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при отправке сообщения');
      
      // Убираем ошибку через 5 секунд
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSending(false);
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

  // Отображаем сообщения так, чтобы новые были сверху
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