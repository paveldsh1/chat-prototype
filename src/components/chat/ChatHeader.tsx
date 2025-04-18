import { Chat } from "@/lib/onlyfans-api";

interface ChatHeaderProps {
  selectedChat: number | null;
  chats: Chat[];
}

export default function ChatHeader({ selectedChat, chats }: ChatHeaderProps) {
  const currentChat = chats.find(c => c.id === selectedChat);
  
  return (
    <div className="p-4 border-b bg-white sticky top-0 z-10">
      <h1 className="text-xl font-bold">
        {selectedChat 
          ? currentChat?.username || 'Неизвестный пользователь'
          : 'Выберите чат'}
      </h1>
    </div>
  );
} 