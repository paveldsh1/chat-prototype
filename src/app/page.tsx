'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback, useRef } from "react";
import { getChats, getChatMessages, sendMessage, checkAuth } from "@/lib/onlyfans-api";
import type { Chat, Message, AccountInfo, MessagePaginationResponse } from "@/lib/onlyfans-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "@/components/ui/use-toast";

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
  const [initializationProgress, setInitializationProgress] = useState(0);
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [paginationCache, setPaginationCache] = useState<Record<string, { next_id: string | null }>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Проверка авторизации и загрузка данных
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setInitializationProgress(0);
      try {
        // Шаг 1: Авторизация (20%)
        const accountInfo = await checkAuth();
        if (!accountInfo) {
          throw new Error('Пользователь не авторизован');
        }
        setAccount(accountInfo);
        setInitializationProgress(20);
        
        // Шаг 2: Загрузка списка чатов (40%)
        const chatList = await getChats();
        if (!Array.isArray(chatList)) {
          throw new Error('Chat list must be an array');
        }
        setChats(chatList);
        setSelectedChat(chatList[0]?.id || null);
        setInitializationProgress(50);
        
        // Шаг 3: Загрузка сообщений для каждого чата (40-100%)
        const totalChats = chatList.length;
        const progressPerChat = 60 / totalChats; // Оставшиеся 60% делим на количество чатов
        
        const newMessageCache: Record<string, Message[]> = {};
        const newPaginationCache: Record<string, { next_id: string | null }> = {};
        
        await Promise.all(
          chatList.map(async (chat, index) => {
            try {
              const messageResponse = await getChatMessages(chat.id.toString());
              
              // Получаем и сортируем сообщения
              const sortedMessages = messageResponse.messages
                .map(msg => ({
                  ...msg,
                  media: msg.media?.map(m => ({
                    ...m,
                    url: m.files?.full?.url || m.url || ''
                  })) || []
                }))
                .sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              
              // Сохраняем сообщения и информацию о пагинации
              newMessageCache[chat.id.toString()] = sortedMessages;
              newPaginationCache[chat.id.toString()] = { 
                next_id: messageResponse.pagination?.next_id || null 
              };
              
              // Обновляем прогресс после загрузки каждого чата
              setInitializationProgress(prev => 
                Math.min(100, 40 + Math.floor((index + 1) * progressPerChat))
              );
            } catch (error) {
              console.error(`Failed to load messages for chat ${chat.id}:`, error);
              newMessageCache[chat.id.toString()] = [];
              newPaginationCache[chat.id.toString()] = { next_id: null };
            }
          })
        );
        
        setMessageCache(newMessageCache);
        setPaginationCache(newPaginationCache);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      } finally {
        setAuthChecking(false);
        setLoadingChats(false);
        setInitializationProgress(100);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Обновляем эффект выбора чата, чтобы использовать кэш
  useEffect(() => {
    if (!selectedChat) return;
    
    // Загружаем сообщения, если их еще нет в кэше
    if (!messageCache[selectedChat.toString()]) {
      (async () => {
        try {
          setLoading(true);
          const response = await getChatMessages(selectedChat.toString());
          
          setMessageCache(prev => ({
            ...prev,
            [selectedChat.toString()]: response.messages
          }));
          
          setPaginationCache(prev => ({
            ...prev,
            [selectedChat.toString()]: { 
              next_id: response.pagination?.next_id || null 
            }
          }));
          
          setMessages(response.messages);
        } catch (error) {
          console.error(`Failed to fetch messages for chat ${selectedChat}:`, error);
          setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // Используем закэшированные сообщения
      setMessages(messageCache[selectedChat.toString()]);
    }
  }, [selectedChat]);

  // Функция для загрузки предыдущих сообщений
  const loadEarlierMessages = async () => {
    if (!selectedChat || loadingMore || !paginationCache[selectedChat.toString()].next_id) {
      return;
    }
    
    setLoadingMore(true);
    
    try {
      const nextId = paginationCache[selectedChat.toString()].next_id;
      if (!nextId) {
        // Больше нет сообщений для загрузки
        setLoadingMore(false);
        return;
      }
      
      const messagesResponse = await getChatMessages(
        selectedChat.toString(), 
        nextId
      );
      
      if (messagesResponse?.messages?.length) {
        setMessageCache(prev => ({
          ...prev,
          [selectedChat.toString()]: [
            ...messagesResponse.messages,
            ...(prev[selectedChat.toString()] || [])
          ]
        }));
        
        setPaginationCache(prev => ({
          ...prev,
          [selectedChat.toString()]: { 
            next_id: messagesResponse.pagination?.next_id || null 
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load earlier messages:', error);
      setError('Не удалось загрузить предыдущие сообщения');
      
      // Если произошла ошибка, сбрасываем пагинацию для предотвращения повторных запросов
      setPaginationCache(prev => ({
        ...prev,
        [selectedChat.toString()]: { next_id: null }
      }));
    } finally {
      setLoadingMore(false);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    // Создаем оптимистичное сообщение
    const optimisticMessage: Message = {
      id: Date.now(), // Временный ID
      text: newMessage,
      timestamp: new Date().toISOString(),
      fromUser: true,
      media: [],
      isFree: true,
      price: 0,
      isNew: true
    };

    // Оптимистично обновляем UI
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageCache(prev => ({
      ...prev,
      [selectedChat.toString()]: [...(prev[selectedChat.toString()] || []), optimisticMessage]
    }));
    setNewMessage(''); // Очищаем поле ввода сразу

    // Отправляем сообщение на сервер
    try {
      setError(null);
      const message = await sendMessage(selectedChat.toString(), newMessage);
      
      // Заменяем оптимистичное сообщение реальным
      setMessages(prev => 
        prev.map(msg => msg.id === optimisticMessage.id ? message : msg)
      );
      setMessageCache(prev => ({
        ...prev,
        [selectedChat.toString()]: prev[selectedChat.toString()].map(msg => 
          msg.id === optimisticMessage.id ? message : msg
        )
      }));
    } catch (error) {
      // В случае ошибки удаляем оптимистичное сообщение
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setMessageCache(prev => ({
        ...prev,
        [selectedChat.toString()]: prev[selectedChat.toString()].filter(msg => msg.id !== optimisticMessage.id)
      }));
      setError(error instanceof Error ? error.message : 'Failed to send message');
      console.error('Failed to send message:', error);
    }
  };

  // Обработчик скролла для загрузки более ранних сообщений
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    
    // Если скроллим вверх и находимся вблизи верха контейнера
    if (container.scrollTop < 100) {
      loadEarlierMessages();
    }
  };

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Инициализация приложения...</h2>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${initializationProgress}%` }}
            />
          </div>
          <p className="text-gray-500">{initializationProgress}%</p>
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
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 flex flex-col h-screen">
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold">
            {selectedChat 
              ? chats.find(c => c.id === selectedChat)?.username || 'Неизвестный пользователь'
              : 'Выберите чат'}
          </h1>
        </div>
        
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto" 
          onScroll={handleScroll}
        >
          <div className="p-4 space-y-4">
            {loadingMore && (
              <div className="text-center mb-4">
                <LoadingSpinner size="sm" text="Загрузка предыдущих сообщений..." />
              </div>
            )}
            {loading && (
              <div className="text-center p-4">
                <LoadingSpinner size="md" text="Загрузка сообщений..." />
              </div>
            )}
            {!loading && messages.length === 0 ? (
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
                    <div className={`flex items-start gap-2 max-w-[70%] ${message.fromUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!message.fromUser && (
                        <Avatar className="mt-0.5 flex-shrink-0">
                          <AvatarImage 
                            src={`https://onlyfans.com/${chats.find(c => c.id === selectedChat)?.username}/avatar`} 
                          />
                          <AvatarFallback>
                            {
                              (() => {
                                const username = chats.find(c => c.id === selectedChat)?.username || '';
                                return username && username.length > 0 ? username[0].toUpperCase() : '?';
                              })()
                            }
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="bg-[#E9ECEF] p-3 rounded-xl">
                        {!message.fromUser && (
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            {chats.find(c => c.id === selectedChat)?.username || 'Неизвестный пользователь'}
                          </div>
                        )}
                        <p className="break-words">{message.text}</p>
                        {message.media && message.media.length > 0 && (
                          <div className="mt-2">
                            {!message.isFree ? (
                              // Платный контент
                              <div className="relative rounded overflow-hidden">
                                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                                  <div className="text-white text-center p-4">
                                    <div className="text-3xl mb-2">🔒</div>
                                    <div className="text-sm mb-1">Платный контент</div>
                                    <div className="text-lg font-bold">${message.price}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {message.media.length} {message.media.length === 1 ? 'файл' : 'файлов'}
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-60"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {message.media.slice(0, 3).map((media, index) => (
                                      <div 
                                        key={media.id} 
                                        className="w-12 h-12 bg-black rounded overflow-hidden border border-white/20"
                                      >
                                        {media.type === 'photo' && media.url && (
                                          <img
                                            src={media.url}
                                            alt=""
                                            className="w-full h-full object-cover opacity-50"
                                          />
                                        )}
                                        {media.type === 'video' && (
                                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                            <span className="text-white text-xl">🎥</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {message.media.length > 3 && (
                                      <div className="text-white text-sm">
                                        +{message.media.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Бесплатный контент
                              <div className="space-y-2">
                                {message.media.map((media) => (
                                  <div key={media.id}>
                                    {media.type === 'photo' ? (
                                      <img
                                        src={media.url}
                                        alt="Media content"
                                        className="rounded max-w-full cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(media.url, '_blank')}
                                      />
                                    ) : media.type === 'video' ? (
                                      <video
                                        src={media.url}
                                        controls
                                        className="rounded max-w-full"
                                      />
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs mt-1 text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 p-4 border-t bg-white mt-auto">
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
