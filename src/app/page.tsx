'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback } from "react";
import { getChats, getChatMessages, sendMessage, checkAuth } from "@/lib/onlyfans-api";
import type { Chat, Message, AccountInfo } from "@/lib/onlyfans-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  // Кэш для сообщений
  const [messageCache, setMessageCache] = useState<Record<number, Message[]>>({});

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
        if (!Array.isArray(chatList)) {
          throw new Error('Chat list must be an array');
        }
        setChats(chatList);
      } catch (error) {
        console.error('Error loading chats:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chats');
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
        
        // Проверяем кэш
        if (messageCache[selectedChat]) {
          setMessages(messageCache[selectedChat]);
          setLoading(false);
          return;
        }

        const messageList = await getChatMessages(selectedChat.toString());
        // Сортируем сообщения по времени (старые сверху)
        const sortedMessages = messageList.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Сохраняем в кэш
        setMessageCache(prev => ({
          ...prev,
          [selectedChat]: sortedMessages
        }));
        
        setMessages(sortedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setError(error instanceof Error ? error.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedChat, messageCache]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setLoading(true);
    try {
      setError(null);
      const message = await sendMessage(selectedChat.toString(), newMessage);
      
      // Обновляем кэш и текущие сообщения
      const updatedMessages = [...messages, message];
      setMessageCache(prev => ({
        ...prev,
        [selectedChat]: updatedMessages
      }));
      setMessages(updatedMessages);
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

  console.log('Chats during render:', chats);

  return (
    <div className="flex h-screen">
      {/* Sidebar с чатами */}
      <div className="w-80 border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Аккаунт</h2>
          <p className="text-sm text-gray-500">{account?.username}</p>
          {account?._meta?._credits && (
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
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://onlyfans.com/${chat.username}/avatar`} />
                        <AvatarFallback>{chat.username ? chat.username[0].toUpperCase() : '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{chat.username || 'Неизвестный пользователь'}</div>
                        {chat.lastMessage && (
                          <div className="text-sm text-gray-500 truncate">{chat.lastMessage}</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Область сообщений */}
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
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.fromUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[70%]">
                      {!message.fromUser && (
                        <Avatar className="mt-0.5">
                          <AvatarImage 
                            src={`https://onlyfans.com/${chats.find(c => c.id === selectedChat)?.username}/avatar`} 
                          />
                          <AvatarFallback>
                            {(chats.find(c => c.id === selectedChat)?.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg p-3 ${
                          message.fromUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <p>{message.text}</p>
                        {message.media && message.media.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.media.map((media) => (
                              <img
                                key={media.id}
                                src={media.url}
                                alt="Media content"
                                className="rounded max-w-full"
                              />
                            ))}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${
                          message.fromUser ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {message.fromUser && (
                        <Avatar className="mt-0.5">
                          <AvatarImage src={account?.avatar} />
                          <AvatarFallback>{(account?.username || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={loading || !newMessage.trim()}
            >
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
