"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import MessageItem from "@/components/MessageItem";
import MessageInput from "@/components/MessageInput";
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
    fetchMessages();
  }, [chatId]);

  const handleSendMessage = async (text: string) => {
    // Реализация отправки сообщения
    console.log("Отправка сообщения:", text);
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
      
      <div className="p-4 border-t">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
} 