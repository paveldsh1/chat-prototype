import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Chat } from "@/lib/onlyfans-api";

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, isSelected, onClick }) => {
  return (
    <Card 
      className={`p-4 cursor-pointer hover:bg-gray-100 ${
        isSelected ? 'bg-gray-100' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={`https://onlyfans.com/${chat.username}/avatar`} />
          <AvatarFallback>
            {chat.username && chat.username.length > 0 
              ? chat.username[0].toUpperCase() 
              : '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">
            {/* Отображаем имя пользователя или ID пользователя, если имя отсутствует */}
            {chat.username && chat.username.trim().length > 0 
              ? chat.username 
              : `User #${chat.id}`}
            
            {/* Если имя не соответствует ожидаемому формату, покажем это */}
            {chat.username === 'm' && (
              <span className="ml-2 text-xs text-red-500">(Неполное имя)</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            ID: {chat.id}
          </div>
          {chat.lastMessage && (
            <div className="text-sm text-gray-500 truncate">{chat.lastMessage}</div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ChatItem; 