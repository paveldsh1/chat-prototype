import { Message, Chat } from "@/lib/onlyfans-api";
import MessageItem from "@/components/MessageItem";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RefObject } from "react";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  loadingMore: boolean;
  selectedChat: number | null;
  chats: Chat[];
  messagesContainerRef: RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export default function MessageList({
  messages,
  loading,
  loadingMore,
  selectedChat,
  chats,
  messagesContainerRef,
  onScroll
}: MessageListProps) {
  
  // Функция рендеринга сообщений
  const renderMessages = () => {
    if (loading && messages.length === 0) {
      return (
        <div className="text-center p-4">
          <LoadingSpinner size="md" text="Загрузка сообщений..." />
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          {selectedChat ? 'Нет сообщений' : 'Выберите чат для просмотра сообщений'}
        </div>
      );
    }

    // Группируем сообщения по дате для отображения разделителей
    const messagesByDate = messages.reduce((acc, message) => {
      // Получаем дату сообщения без времени
      const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
      if (!acc[messageDate]) {
        acc[messageDate] = [];
      }
      acc[messageDate].push(message);
      return acc;
    }, {} as Record<string, Message[]>);

    // Сортируем даты
    const sortedDates = Object.keys(messagesByDate).sort();

    return (
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const dayMessages = messagesByDate[date];
          
          // Форматируем дату для отображения
          const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          
          return (
            <div key={date} className="space-y-4">
              {/* Разделитель даты */}
              <div className="flex justify-center">
                <div className="bg-gray-100 px-4 py-1 rounded-full text-sm text-gray-500">
                  {formattedDate}
                </div>
              </div>
              
              {/* Сообщения за текущий день */}
              {dayMessages.map((message, index) => {
                // Генерируем уникальный ключ, добавляя индекс
                const uniqueKey = `${message.id}-${date}-${index}`;
                
                // Подготавливаем медиа-данные
                const mediaData = message.media && message.media.length > 0
                  ? message.media.map(m => ({
                      id: typeof m.id === 'number' ? m.id : Number(m.id),
                      type: m.type,
                      url: m.url || (m.files?.full?.url || '')
                    }))
                  : [];
                
                // Подготавливаем данные для MessageItem
                const messageData = {
                  id: message.id.toString(),
                  text: message.text,
                  fromUser: {
                    id: message.fromUser ? "user" : selectedChat?.toString() || "",
                    name: message.fromUser ? "Вы" : chats.find(c => c.id === selectedChat)?.username || "Пользователь",
                    username: message.fromUser ? "Вы" : chats.find(c => c.id === selectedChat)?.username || "user",
                    avatar: message.fromUser ? null : `https://onlyfans.com/${chats.find(c => c.id === selectedChat)?.username}/avatar`
                  },
                  mediaType: mediaData[0]?.type || null,
                  mediaUrl: mediaData[0]?.url || null,
                  createdAt: message.timestamp,
                  isFromUser: message.fromUser,
                  price: message.price || 0,
                  isFree: message.isFree !== false,
                  isOpened: true,
                  media: mediaData
                };

                // Определяем дату предыдущего сообщения (если оно есть)
                const previousMessage = index > 0 ? dayMessages[index - 1] : undefined;
                const previousMessageDate = previousMessage?.timestamp;

                return (
                  <MessageItem 
                    key={uniqueKey} 
                    message={messageData} 
                    previousMessageDate={previousMessageDate}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto"
      onScroll={onScroll}
    >
      <div className="p-4 space-y-4">
        {/* Индикатор загрузки предыдущих сообщений */}
        {loadingMore && (
          <div className="text-center mb-4">
            <LoadingSpinner size="sm" text="Загрузка предыдущих сообщений..." />
          </div>
        )}
        
        {/* Отображение сообщений */}
        {renderMessages()}
      </div>
    </div>
  );
} 