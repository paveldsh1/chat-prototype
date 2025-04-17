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
import MessageItem from "@/components/MessageItem";
import { Paperclip, X } from 'lucide-react';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Убираем автоматический выбор первого чата
        setSelectedChat(null);
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

  // Обновляем эффект выбора чата, чтобы использовать кэш и добавить автообновление
  useEffect(() => {
    if (!selectedChat) {
      // Если чат не выбран, очищаем сообщения
      setMessages([]);
      return;
    }
    
    // Очищаем текущие сообщения при переключении чата
    setMessages([]);
    
    // Форматируем ID чата
    const chatIdStr = selectedChat.toString();
    console.log(`Loading messages for chat: ${chatIdStr}`);
    
    // Загружаем сообщения, если их еще нет в кэше
    if (!messageCache[chatIdStr] || messageCache[chatIdStr].length === 0) {
      (async () => {
        try {
          setLoading(true);
          const response = await getChatMessages(chatIdStr);
          
          // Убедимся, что сообщения отсортированы
          const sortedMessages = [...response.messages].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          console.log(`Loaded ${sortedMessages.length} messages for chat ${chatIdStr}`);
          
          // Сохраняем в кэш
          setMessageCache(prev => ({
            ...prev,
            [chatIdStr]: sortedMessages
          }));
          
          // Обновляем информацию о пагинации
          setPaginationCache(prev => ({
            ...prev,
            [chatIdStr]: { 
              next_id: response.pagination?.next_id || null 
            }
          }));
          
          // Устанавливаем сообщения для отображения
          setMessages(sortedMessages);
        } catch (error) {
          console.error(`Failed to fetch messages for chat ${chatIdStr}:`, error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          // Сбрасываем кэш для данного чата
          setMessageCache(prev => ({
            ...prev,
            [chatIdStr]: []
          }));
          setPaginationCache(prev => ({
            ...prev,
            [chatIdStr]: { next_id: null }
          }));
          setMessages([]);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      console.log(`Using cached messages for chat ${chatIdStr}, ${messageCache[chatIdStr].length} messages available`);
      setMessages(messageCache[chatIdStr]);
    }
    
    // Настраиваем интервал для обновления сообщений каждую секунду
    console.log("Настройка интервала обновления сообщений...");
    const intervalId = setInterval(() => {
      console.log("Запрос новых сообщений для чата:", chatIdStr);
      
      getChatMessages(chatIdStr).then(response => {
        console.log(`Получено ${response.messages.length} сообщений от API`);
        
        // Обновляем сообщения, добавляя только новые
        setMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(msg => msg.id));
          const newMessages = response.messages.filter(msg => !existingIds.has(msg.id));
          
          if (newMessages.length > 0) {
            console.log(`Добавлено ${newMessages.length} новых сообщений`);
            
            // Прокручиваем чат вниз при новых сообщениях
            setTimeout(() => {
              messagesContainerRef.current?.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }, 100);
            
            // Обновляем кэш сообщений
            const updatedMessages = [...newMessages, ...prevMessages];
            setMessageCache(prev => ({
              ...prev,
              [chatIdStr]: updatedMessages
            }));
            
            return updatedMessages;
          }
          
          return prevMessages;
        });
        
        // Обновляем информацию о пагинации
        setPaginationCache(prev => ({
          ...prev,
          [chatIdStr]: { 
            next_id: response.pagination?.next_id || null 
          }
        }));
      }).catch(err => {
        console.error("Ошибка при обновлении сообщений:", err);
      });
    }, 1000);
    
    // Очищаем интервал при размонтировании или смене чата
    return () => {
      console.log("Очистка интервала обновления сообщений");
      clearInterval(intervalId);
    };
  }, [selectedChat, messageCache]);

  // Функция загрузки более ранних сообщений
  const loadEarlierMessages = async () => {
    if (!selectedChat || loadingMore || !paginationCache[selectedChat.toString()]?.next_id) {
      return;
    }
    
    try {
      setLoadingMore(true);
      
      const chatIdStr = selectedChat.toString();
      const nextId = paginationCache[chatIdStr]?.next_id;
      console.log(`Loading earlier messages for chat ${chatIdStr}, next_id: ${nextId}`);
      
      const response = await getChatMessages(chatIdStr, nextId || undefined);
      
      // Убедимся, что сообщения отсортированы
      const sortedNewMessages = [...response.messages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Получаем текущие ID сообщений для предотвращения дублирования
      const existingIds = new Set(messages.map(m => m.id));
      
      // Фильтруем новые сообщения, которых еще нет
      const uniqueNewMessages = sortedNewMessages.filter(msg => !existingIds.has(msg.id));
      
      console.log(`Loaded ${sortedNewMessages.length} earlier messages, ${uniqueNewMessages.length} are new`);
      
      // Обновляем кэш
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        // Используем Set для удаления дубликатов по ID
        const allMessageIds = new Set([...chatMessages, ...uniqueNewMessages].map(m => m.id));
        const uniqueMessages = [...allMessageIds].map(id => 
          [...chatMessages, ...uniqueNewMessages].find(m => m.id === id)
        ).filter(Boolean) as Message[];
        
        // Сортируем все сообщения по времени
        const sortedAllMessages = uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return {
          ...prev,
          [chatIdStr]: sortedAllMessages
        };
      });
      
      // Обновляем информацию о пагинации
      setPaginationCache(prev => ({
        ...prev,
        [chatIdStr]: { 
          next_id: response.pagination?.next_id || null 
        }
      }));
      
      // Обновляем сообщения
      setMessages(prevMessages => {
        // Объединяем старые и новые сообщения без дубликатов
        const allMessageIds = new Set([...prevMessages, ...uniqueNewMessages].map(m => m.id));
        const uniqueMessages = [...allMessageIds].map(id => 
          [...prevMessages, ...uniqueNewMessages].find(m => m.id === id)
        ).filter(Boolean) as Message[];
        
        // Сортируем все сообщения по времени
        return uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } catch (error) {
      console.error(`Failed to fetch earlier messages:`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Создаем URL для превью при выборе файла
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // Очищаем URL при размонтировании компонента
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log('File selected:', file.name, file.type, file.size);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!newMessage.trim() && !selectedFile)) return;

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

    if (selectedFile) {
      console.log('Sending message with file:', selectedFile.name);
      // Здесь добавьте логику отправки файла
      
      // Отправляем формдату с файлом
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (newMessage.trim()) {
        formData.append('text', newMessage.trim());
      }
      
      try {
        const response = await fetch(`/api/onlyfans/chats/${selectedChat.toString()}/messages`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при отправке файла');
        }
        
        const data = await response.json();
        console.log('Файл успешно отправлен:', data);
        
      } catch (fileError) {
        console.error('Ошибка при отправке файла:', fileError);
        setError(fileError instanceof Error ? fileError.message : 'Failed to send file');
      }
    }
    
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Обработчик скролла для загрузки более ранних сообщений
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    
    // Если скроллим вверх и находимся вблизи верха контейнера
    if (container.scrollTop < 100 && !loadingMore && selectedChat) {
      console.log('Triggering loadEarlierMessages from scroll handler');
      loadEarlierMessages();
    }
  };

  // Место для отображения сообщений
  // Улучшаем отображение MessageItem компонента
  const renderMessages = () => {
    if (loading) {
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

    // Выводим в консоль первое сообщение для отладки
    if (messages.length > 0) {
      console.log('First message:', messages[0]);
      if (messages[0].media && messages[0].media.length > 0) {
        console.log('Media in first message:', messages[0].media);
      }
    }

    return (
      <div className="space-y-4">
        {messages.map((message, index) => {
          // Генерируем уникальный ключ, добавляя индекс
          const uniqueKey = `${message.id}-${index}`;
          
          // Принудительно добавляем хотя бы одно медиа для отображения заглушки
          // Для отладки и демонстрации заглушек
          let forcedMedia = message.media || [];
          if (forcedMedia.length === 0) {
            // Каждому третьему сообщению добавляем фото
            // Каждому пятому видео
            if (index % 3 === 0) {
              forcedMedia = [{
                id: index, // Используем числовой id вместо строки
                type: 'photo',
                // Не указываем URL, чтобы вызвать заглушку
              }];
            } else if (index % 5 === 0) {
              forcedMedia = [{
                id: index, // Используем числовой id вместо строки
                type: 'video',
                // Не указываем URL, чтобы вызвать заглушку
              }];
            }
          }
          
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
            mediaType: forcedMedia[0]?.type || null,
            mediaUrl: forcedMedia[0]?.url || null,
            createdAt: message.timestamp,
            isFromUser: message.fromUser,
            price: message.price || 0,
            isFree: message.isFree !== false,
            isOpened: true,
            media: forcedMedia
          };

          // Добавим логирование для отладки
          console.log(`Message ${uniqueKey} from user: ${message.fromUser}, will display on ${message.fromUser ? 'right' : 'left'}`);

          // Определяем дату предыдущего сообщения (если оно есть)
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
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

        <div className="sticky bottom-0 p-4 border-t bg-white mt-auto">
          <div className="flex flex-col gap-2">
            {selectedFile && (
              <div className="p-3 bg-gray-100 rounded-md flex items-start">
                <div className="flex-1 flex items-center gap-3">
                  {previewUrl && (
                    <div className="relative w-16 h-16 rounded overflow-hidden border border-gray-300">
                      <img 
                        src={previewUrl} 
                        alt="Предпросмотр" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} КБ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={loading || (!newMessage.trim() && !selectedFile)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Отправить
              </Button>
              <Button 
                type="button"
                onClick={handleFileSelect}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
              >
                <Paperclip className="h-5 w-5" />
                <span className="hidden sm:inline">Фото</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
