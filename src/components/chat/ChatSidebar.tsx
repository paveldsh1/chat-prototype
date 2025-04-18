import React from 'react';
import ChatList from './ChatList';
import { Chat, AccountInfo } from "@/lib/onlyfans-api";

interface ChatSidebarProps {
  account: AccountInfo | null;
  chats: Chat[];
  loadingChats: boolean;
  selectedChat: number | null;
  onSelectChat: (chatId: number) => void;
  error: string | null;
  paginationCache: Record<string, { next_id: string | null }>;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  account,
  chats,
  loadingChats,
  selectedChat,
  onSelectChat,
  error,
  paginationCache
}: ChatSidebarProps) => {
  return (
    <div className="w-80 border-r">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Аккаунт</h2>
        <p className="text-sm text-gray-500">{account?.username}</p>
        {account?._meta?._credits && (
          <p className="text-sm text-gray-500">
            Кредиты: {account?._meta?._credits.balance}
          </p>
        )}
        
        {/* Отладочная информация */}
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          <h3 className="font-bold mb-1">Debug Info:</h3>
          <div className="overflow-x-auto">
            {chats.map((chat, index) => (
              <div key={index} className="mb-2 border-b border-gray-200 pb-1">
                <div><strong>Chat {index + 1} (ID: {chat.id}):</strong></div>
                <div>Username: "{chat.username}"</div>
                <div>Username Length: {chat.username ? chat.username.length : 0}</div>
                
                {/* Добавим информацию о пагинации */}
                <div>
                  Pagination ID: {paginationCache[chat.id.toString()]?.next_id || 'null'}
                </div>
                
                {/* Добавим кнопку для копирования ID чата */}
                <button 
                  className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(chat.id.toString());
                    alert(`ID чата ${chat.id} скопирован в буфер обмена`);
                  }}
                >
                  Копировать ID
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Список чатов */}
      <ChatList 
        chats={chats}
        loadingChats={loadingChats}
        selectedChat={selectedChat}
        onSelectChat={onSelectChat}
        error={error}
      />
    </div>
  );
};

export default ChatSidebar; 