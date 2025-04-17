"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import MessageItem from "@/components/MessageItem";
import ChatInput from "@/components/ChatInput";
import LoadingSpinner from "@/components/LoadingSpinner";

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

  const fetchMessages = async (lastMessageId?: string) => {
    try {
      let url = `/api/onlyfans/chats/${chatId}/messages?limit=20`;
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
        setMessages(prev => [...prev, ...data.messages]);
      } else {
        // Инициализация с новыми сообщениями
        setMessages(data.messages);
        // Прокрутка вниз при первой загрузке
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
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

  const handleSendMessage = async (text: string, file?: File) => {
    try {
      // Защита от повторной отправки
      if (sendingMessage) return;
      setSendingMessage(true);
      
      console.log("Отправка сообщения:", { text, file: file ? `${file.name} (${file.type})` : 'none' });
      
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
        price: 0,
        isFree: true,
        isOpened: true
      };
      
      // Добавляем временное сообщение в список
      setMessages(prev => [newMessage, ...prev]);
      
      // Прокручиваем вниз к новому сообщению
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      // Отправляем сообщение на сервер
      let formData = new FormData();
      formData.append('text', text);
      
      if (file) {
        console.log("Добавление файла к FormData:", file.name, file.type, file.size);
        formData.append('file', file);
      }
      
      console.log("Отправка запроса на сервер:", `/api/onlyfans/chats/${chatId}/messages`);
      const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
        method: 'POST',
        body: file ? formData : JSON.stringify({ text }),
        headers: file ? undefined : {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Статус ответа:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ошибка при отправке:", response.status, errorText);
        throw new Error(`Не удалось отправить сообщение: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Ответ сервера:", data);
      
      // Заменяем временное сообщение на реальное с сервера
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? {
          ...msg,
          id: data.data.id.toString(),
          createdAt: data.data.createdAt,
          // Другие поля, которые могут прийти с сервера
        } : msg
      ));
      
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      // Можно добавить уведомление об ошибке
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

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4">
        {nextId && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={loadMoreMessages}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={loadingMore}
            >
              {loadingMore ? "Загрузка..." : "Загрузить предыдущие сообщения"}
            </button>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            Нет сообщений
          </div>
        ) : (
          messages.map((message, index) => {
            // Определяем дату предыдущего сообщения (если оно есть)
            const previousMessage = index > 0 ? messages[index - 1] : undefined;
            return (
              <MessageItem 
                key={message.id} 
                message={message} 
                previousMessageDate={previousMessage?.createdAt}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-white">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={sendingMessage} 
        />
      </div>
    </div>
  );
} 