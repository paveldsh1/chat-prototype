'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { getChats, getChatMessages, sendMessage, checkAuth } from "@/lib/onlyfans-api";
import type { Chat, Message, AccountInfo } from "@/lib/onlyfans-api";

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Проверка авторизации
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        setError(null);
        const accountInfo = await checkAuth();
        setAccount(accountInfo);
        console.log('Auth successful:', accountInfo);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to authenticate');
        console.error('Auth failed:', error);
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAuth();
  }, []);

  // Загрузка чатов только после успешной авторизации
  useEffect(() => {
    if (!account || authChecking) return;

    const loadChats = async () => {
      try {
        setError(null);
        setLoadingChats(true);
        const chatList = await getChats();
        setChats(chatList);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load chats');
        console.error('Failed to load chats:', error);
      } finally {
        setLoadingChats(false);
      }
    };
    
    loadChats();
  }, [account, authChecking]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (!selectedChat) return;

    const loadMessages = async () => {
      try {
        setError(null);
        setLoading(true);
        const messageList = await getChatMessages(selectedChat);
        setMessages(messageList);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load messages');
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedChat]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setLoading(true);
    try {
      setError(null);
      const message = await sendMessage(selectedChat, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Проверка авторизации...</h2>
          <p className="text-gray-500">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Ошибка авторизации</h2>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Account info */}
      <div className="w-80 border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Аккаунт</h2>
          <p className="text-sm text-gray-500">{account.username}</p>
          {account._meta?._credits && (
            <p className="text-sm text-gray-500">
              Кредиты: {account._meta._credits.balance}
            </p>
          )}
        </div>

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
                <div className="text-center p-4">Загрузка чатов...</div>
              ) : chats.length === 0 ? (
                <div className="text-center p-4 text-gray-500">Нет доступных чатов</div>
              ) : (
                chats.map((chat) => (
                  <Card 
                    key={chat.id}
                    className={`p-4 cursor-pointer hover:bg-gray-100 ${
                      selectedChat === chat.id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setSelectedChat(chat.id)}
                  >
                    <div className="font-medium">{chat.username}</div>
                    {chat.lastMessage && (
                      <div className="text-sm text-gray-500">{chat.lastMessage}</div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">
            {selectedChat 
              ? chats.find(c => c.id === selectedChat)?.username 
              : 'Выберите чат'}
          </h1>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {loading && !messages.length ? (
              <div className="text-center p-4">Загрузка сообщений...</div>
            ) : messages.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                {selectedChat ? 'Нет сообщений' : 'Выберите чат для просмотра сообщений'}
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.fromUser 
                      ? 'bg-blue-500 text-white ml-auto' 
                      : 'bg-gray-100'
                  }`}
                >
                  {message.text}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={!selectedChat || loading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!selectedChat || loading}
            >
              {loading ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
