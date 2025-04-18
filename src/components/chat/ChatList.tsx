import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChatItem from "@/components/ChatItem";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Chat } from "@/lib/onlyfans-api";

interface ChatListProps {
  chats: Chat[];
  loadingChats: boolean;
  selectedChat: number | null;
  onSelectChat: (chatId: number) => void;
  error: string | null;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  loadingChats,
  selectedChat,
  onSelectChat,
  error
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Чаты</h2>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-2">
          {loadingChats ? (
            <div className="text-center p-4">
              <LoadingSpinner size="sm" text="Загрузка чатов..." />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center p-4 text-gray-500">Нет доступных чатов</div>
          ) : (
            chats.map((chat) => (
              <ChatItem 
                key={chat.id}
                chat={chat}
                isSelected={selectedChat === chat.id}
                onClick={() => onSelectChat(chat.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatList; 