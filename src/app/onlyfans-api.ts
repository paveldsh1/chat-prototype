import { handleApiResponse } from '@/lib/api-utils';

export interface Chat {
  id: number;
  username: string;
  lastMessage?: string;
  unreadCount: number;
}

export interface Message {
  id: number;
  text: string;
  fromUser: boolean;
  timestamp: string;
}

export async function getChats(): Promise<Chat[]> {
  const response = await fetch('/api/onlyfans/chats');
  const data = await handleApiResponse(response);
  
  console.log('Raw API Response:', JSON.stringify(data, null, 2));
  
  // Проверяем, что data.data существует и является массивом
  if (!data.data || !Array.isArray(data.data)) {
    console.error('Invalid data structure:', data);
    throw new Error('Invalid response format from chats API');
  }
  
  const mappedChats = data.data.map((chat: any) => ({
    id: chat.fan.id,
    username: chat.fan._view || 'Unknown',
    lastMessage: chat.lastMessage?.text?.replace(/<[^>]*>/g, '') || undefined,
    unreadCount: chat.unreadMessagesCount
  }));

  console.log('Mapped chats:', mappedChats);
  
  return mappedChats;
}

export async function getChatMessages(chatId: number): Promise<Message[]> {
  const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`);
  const data = await handleApiResponse(response);
  
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid response format from messages API');
  }
  
  return data.data.map((msg: any) => ({
    id: msg.id,
    text: msg.text,
    fromUser: msg.fromUser,
    timestamp: msg.createdAt
  }));
}

export async function sendMessage(chatId: number, text: string): Promise<Message> {
  const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  
  const data = await handleApiResponse(response);
  
  return {
    id: data.id,
    text: data.text,
    fromUser: true,
    timestamp: data.createdAt
  };
} 