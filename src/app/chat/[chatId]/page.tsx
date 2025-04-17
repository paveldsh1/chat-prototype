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
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (lastMessageId?: string) => {
    try {
      // Запрашиваем больше сообщений при первой загрузке
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
        // Для подгрузки старых сообщений - добавляем в конец
        setMessages(prev => [...prev, ...data.messages]);
      } else {
        // ВАЖНО: сначала показываем новые сообщения (обратный порядок)
        const sortedMessages = [...data.messages].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        console.log("Загружено сообщений:", sortedMessages.length);
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
      // Защита от повторной отправки
      if (sendingMessage) return;
      setSendingMessage(true);
      
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
      
      // Добавляем временное сообщение В НАЧАЛО списка (как самое новое)
      setMessages(prev => [newMessage, ...prev]);
      
      // Отправляем сообщение на сервер
      let formData = new FormData();
      formData.append('text', text);
      
      if (file) {
        formData.append('file', file);
        console.log(`Отправляем файл: ${file.name}, размер: ${file.size}, тип: ${file.type}`);
        
        // Добавляем цену, если файл платный
        if (price > 0) {
          formData.append('price', price.toString());
          console.log(`Установлена цена: ${price}`);
        }
      }
      
      const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
        method: 'POST',
        body: file ? formData : JSON.stringify({ text }),
        headers: file ? undefined : {
          'Content-Type': 'application/json'
        }
      });
      
      // Читаем ответ в текстовом формате для логирования
      const responseText = await response.text();
      console.log(`Получен ответ от сервера: ${responseText.substring(0, 200)}...`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Ошибка при парсинге JSON ответа:', jsonError);
        throw new Error('Неверный формат ответа от сервера');
      }
      
      if (!response.ok) {
        // Обрабатываем ошибку от сервера
        console.error('Ошибка при отправке сообщения:', data);
        
        // Помечаем временное сообщение как ошибочное
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...msg,
            text: msg.text + ' (Ошибка при отправке)',
            error: true
          } : msg
        ));
        
        // Показываем пользователю ошибку
        setError(data.message || data.error || `Не удалось отправить сообщение: ${response.status}`);
        
        // Через 5 секунд убираем сообщение об ошибке
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
          // Другие поля, которые могут прийти с сервера
          media: data.data.media || []
        } : msg
      ));
      
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      // Устанавливаем сообщение об ошибке
      setError(error instanceof Error ? error.message : 'Произошла ошибка при отправке сообщения');
      
      // Через 5 секунд убираем сообщение об ошибке
      setTimeout(() => setError(null), 5000);
    } finally {
      setSendingMessage(false);
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
          isLoading={sendingMessage} 
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