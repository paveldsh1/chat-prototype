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
  const [isSending, setIsSending] = useState<boolean>(false);
  const isUpdatingRef = useRef<boolean>(false);

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
              
              // Обработка сообщений и их медиа
              const processedMessages = messageResponse.messages.map(msg => ({
                ...msg,
                media: msg.media?.map(m => ({
                  ...m,
                  url: m.files?.full?.url || m.url || ''
                })) || []
              }));
              
              // Удаляем возможные дубликаты по ID
              const uniqueMessages = Array.from(
                new Map(processedMessages.map(msg => [msg.id, msg])).values()
              );
              
              // Сортируем сообщения по времени
              const sortedMessages = uniqueMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              
              console.log(`Loaded ${sortedMessages.length} messages for chat ${chat.id}`);
              
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
    
    // Флаг, который будет показывать, что компонент размонтирован
    let isMounted = true;
    
    // Очищаем текущие сообщения при переключении чата
    setMessages([]);
    
    // Форматируем ID чата
    const chatIdStr = selectedChat.toString();
    console.log(`Loading messages for chat: ${chatIdStr}`);
    
    // Загружаем сообщения, если их еще нет в кэше
    const loadInitialMessages = async () => {
      try {
        setLoading(true);
        const response = await getChatMessages(chatIdStr);
        
        // Обработка полученных сообщений и медиа
        const processedMessages = response.messages.map(msg => ({
          ...msg,
          media: msg.media?.map(m => ({
            ...m,
            url: m.files?.full?.url || m.url || ''
          })) || []
        }));
        
        // Убедимся, что сообщения отсортированы и уникальны
        const uniqueMessages = Array.from(
          new Map(processedMessages.map(msg => [msg.id, msg])).values()
        );
        
        const sortedMessages = uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log(`Loaded ${sortedMessages.length} messages for chat ${chatIdStr}`);
        
        // Обновляем только если компонент все еще смонтирован
        if (isMounted) {
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
        }
      } catch (error) {
        console.error(`Failed to fetch messages for chat ${chatIdStr}:`, error);
        if (isMounted) {
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
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Если в кэше нет сообщений, загружаем их
    if (!messageCache[chatIdStr] || messageCache[chatIdStr].length === 0) {
      loadInitialMessages();
    } else {
      console.log(`Using cached messages for chat ${chatIdStr}, ${messageCache[chatIdStr].length} messages available`);
      setMessages(messageCache[chatIdStr]);
    }
    
    // Функция для обновления сообщений
    const fetchNewMessages = async () => {
      if (!isMounted) return;
      
      console.log("Запрос новых сообщений для чата:", chatIdStr);
      
      try {
        const response = await getChatMessages(chatIdStr);
        if (!isMounted) return;
        
        console.log(`Получено ${response.messages.length} сообщений от API`);
        
        // Обновляем состояние только если компонент все еще смонтирован
        if (isMounted) {
          // Получаем актуальные сообщения из состояния и кэша
          const currentMessages = messageCache[chatIdStr] || [];
          
          // Преобразуем массив текущих сообщений в Set для быстрого поиска
          const existingIds = new Set(currentMessages.map(msg => msg.id));
          
          // Фильтруем новые сообщения, которых еще нет в текущем массиве сообщений
          const newMessages = response.messages.filter(msg => !existingIds.has(msg.id));
          
          if (newMessages.length > 0) {
            console.log(`Добавлено ${newMessages.length} новых сообщений`);
            
            // Обработка медиа
            const processedNewMessages = newMessages.map(msg => ({
              ...msg,
              media: msg.media?.map(m => ({
                ...m,
                url: m.files?.full?.url || m.url || ''
              })) || []
            }));
            
            // Обновляем состояние сообщений, используя функциональное обновление
            setMessages(prevMessages => {
              // Объединяем существующие и новые сообщения
              const allMessages = [...prevMessages, ...processedNewMessages];
              
              // Удаляем дубликаты по ID
              const uniqueMessages = Array.from(
                new Map(allMessages.map(msg => [msg.id, msg])).values()
              );
              
              // Сортируем сообщения по времени
              return uniqueMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            });
            
            // Обновляем кэш сообщений
            setMessageCache(prev => {
              const cachedMessages = prev[chatIdStr] || [];
              
              // Объединяем кэшированные и новые сообщения
              const allMessages = [...cachedMessages, ...processedNewMessages];
              
              // Удаляем дубликаты по ID
              const uniqueMessages = Array.from(
                new Map(allMessages.map(msg => [msg.id, msg])).values()
              );
              
              // Сортируем по времени
              const sortedMessages = uniqueMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              
              return {
                ...prev,
                [chatIdStr]: sortedMessages
              };
            });
            
            // Прокручиваем чат вниз при новых сообщениях
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTo({
                  top: messagesContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 100);
          }
          
          // Обновляем информацию о пагинации
          setPaginationCache(prev => ({
            ...prev,
            [chatIdStr]: { 
              next_id: response.pagination?.next_id || null 
            }
          }));
        }
      } catch (err) {
        console.error("Ошибка при обновлении сообщений:", err);
      }
    };
    
    // Настраиваем интервал для обновления сообщений каждую секунду
    console.log("Настройка интервала обновления сообщений...");
    
    const updateMessagesWithDebounce = async () => {
      // Если запрос уже выполняется или компонент размонтирован, пропускаем
      if (isUpdatingRef.current || !isMounted) {
        console.log("Предыдущий запрос еще не завершен или компонент размонтирован, пропускаем");
        return;
      }
      
      isUpdatingRef.current = true;
      
      try {
        await fetchNewMessages();
      } finally {
        // Обязательно сбрасываем флаг, даже если произошла ошибка
        isUpdatingRef.current = false;
      }
    };
    
    const intervalId = setInterval(updateMessagesWithDebounce, 1000);
    
    // Сразу запрашиваем первый раз, не дожидаясь первого интервала
    updateMessagesWithDebounce();
    
    // Очищаем интервал при размонтировании или смене чата
    return () => {
      console.log("Очистка интервала обновления сообщений");
      isMounted = false;
      clearInterval(intervalId);
      // Сбрасываем флаг обновления
      isUpdatingRef.current = false;
    };
  }, [selectedChat]);

  // Функция загрузки более ранних сообщений
  const loadEarlierMessages = async () => {
    if (!selectedChat || loadingMore || !paginationCache[selectedChat.toString()]?.next_id) {
      return;
    }
    
    // Блокируем повторные загрузки на время выполнения
    setLoadingMore(true);
    
    // Временно блокируем автоматическое обновление сообщений
    isUpdatingRef.current = true;
    
    // Флаг для отслеживания размонтирования
    let isComponentMounted = true;
    
    try {
      const chatIdStr = selectedChat.toString();
      const nextId = paginationCache[chatIdStr]?.next_id;
      console.log(`Loading earlier messages for chat ${chatIdStr}, next_id: ${nextId}`);
      
      const response = await getChatMessages(chatIdStr, nextId || undefined);
      
      // Проверяем, что компонент всё ещё смонтирован
      if (!isComponentMounted) return;
      
      // Обработка полученных сообщений и их медиа
      const processedMessages = response.messages.map(msg => ({
        ...msg,
        media: msg.media?.map(m => ({
          ...m,
          url: m.files?.full?.url || m.url || ''
        })) || []
      }));
      
      // Сортируем полученные сообщения
      const sortedNewMessages = [...processedMessages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Получаем актуальные данные из состояния
      const currentMessages = messageCache[chatIdStr] || [];
      
      // Получаем текущие ID сообщений для предотвращения дублирования
      const existingIds = new Set(currentMessages.map(m => m.id));
      
      // Фильтруем новые сообщения, которых еще нет
      const uniqueNewMessages = sortedNewMessages.filter(msg => !existingIds.has(msg.id));
      
      console.log(`Loaded ${sortedNewMessages.length} earlier messages, ${uniqueNewMessages.length} are new`);
      
      if (uniqueNewMessages.length === 0) {
        console.log('No new messages found, updating pagination info only');
        // Если нет новых сообщений, просто обновляем информацию о пагинации
        setPaginationCache(prev => ({
          ...prev,
          [chatIdStr]: { 
            next_id: response.pagination?.next_id || null 
          }
        }));
        
        // Разблокируем загрузки
        setLoadingMore(false);
        isUpdatingRef.current = false;
        
        return;
      }
      
      // Сохраняем текущую позицию скролла для восстановления после обновления
      if (messagesContainerRef.current) {
        scrollPositionRef.current = messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop;
      }
      
      // Обновляем сообщения, используя функциональное обновление
      setMessages(prevMessages => {
        // Объединяем новые и существующие сообщения
        const allMessages = [...uniqueNewMessages, ...prevMessages];
        
        // Удаляем дубликаты по ID
        const uniqueMessages = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        );
        
        // Сортируем сообщения по времени
        return uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      
      // Обновляем кэш сообщений
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        
        // Объединяем все сообщения
        const allMessages = [...uniqueNewMessages, ...chatMessages];
        
        // Удаляем дубликаты по ID
        const uniqueMessages = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        );
        
        // Сортируем по времени
        const sortedMessages = uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return {
          ...prev,
          [chatIdStr]: sortedMessages
        };
      });
      
      // Обновляем информацию о пагинации
      setPaginationCache(prev => ({
        ...prev,
        [chatIdStr]: { 
          next_id: response.pagination?.next_id || null 
        }
      }));
      
      // Восстанавливаем позицию скролла после добавления сообщений
      setTimeout(() => {
        if (messagesContainerRef.current && isComponentMounted) {
          const newScrollTop = messagesContainerRef.current.scrollHeight - scrollPositionRef.current;
          messagesContainerRef.current.scrollTop = newScrollTop;
        }
      }, 100);
    } catch (error) {
      if (!isComponentMounted) return;
      
      console.error(`Failed to fetch earlier messages:`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      if (isComponentMounted) {
        setLoadingMore(false);
        // Разблокируем автоматическое обновление сообщений
        isUpdatingRef.current = false;
      }
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
    
    setIsSending(true);
    
    // Временно отключаем автоматическое обновление сообщений
    isUpdatingRef.current = true;

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

    // Очищаем поле ввода сразу
    setNewMessage('');

    // Получаем ID чата в виде строки для использования в кэше
    const chatIdStr = selectedChat.toString();

    // Оптимистично обновляем UI
    setMessages(prev => [...prev, optimisticMessage]);

    // Обновляем кэш сообщений
    setMessageCache(prev => {
      const chatMessages = prev[chatIdStr] || [];
      return {
        ...prev,
        [chatIdStr]: [...chatMessages, optimisticMessage]
      };
    });

    try {
      setError(null);
      
      // Прокручиваем чат вниз после создания оптимистичного сообщения
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
      
      // Фиксируем текст сообщения перед очисткой поля ввода
      const messageText = newMessage;
      
      // Отправляем сообщение на сервер
      const message = await sendMessage(chatIdStr, messageText);
      
      // Обработка медиа в полученном сообщении
      const processedMessage = {
        ...message,
        media: message.media?.map(m => ({
          ...m,
          url: m.files?.full?.url || m.url || ''
        })) || []
      };
      
      // Заменяем оптимистичное сообщение реальным
      setMessages(prev => 
        prev.map(msg => msg.id === optimisticMessage.id ? processedMessage : msg)
      );
      
      // Обновляем кэш сообщений
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        return {
          ...prev,
          [chatIdStr]: chatMessages.map(msg => 
            msg.id === optimisticMessage.id ? processedMessage : msg
          )
        };
      });
    } catch (error) {
      // В случае ошибки удаляем оптимистичное сообщение
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        return {
          ...prev,
          [chatIdStr]: chatMessages.filter(msg => msg.id !== optimisticMessage.id)
        };
      });
      setError(error instanceof Error ? error.message : 'Failed to send message');
      console.error('Failed to send message:', error);
    }

    // Обработка отправки файла, если он выбран
    if (selectedFile) {
      console.log('Sending message with file:', selectedFile.name);
      
      // Создаем оптимистичное сообщение для файла
      const fileOptimisticMessage: Message = {
        id: Date.now() + 1, // Другой ID для отличия от текстового сообщения
        text: '',
        timestamp: new Date().toISOString(),
        fromUser: true,
        media: [{
          id: Date.now(),
          type: selectedFile?.type.startsWith('image/') ? 'photo' : 'video',
          url: previewUrl || ''
        }],
        isFree: true,
        price: 0,
        isNew: true
      };
      
      // Добавляем в UI оптимистичное сообщение с файлом
      setMessages(prev => [...prev, fileOptimisticMessage]);
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        return {
          ...prev,
          [chatIdStr]: [...chatMessages, fileOptimisticMessage]
        };
      });
      
      // Отправляем формдату с файлом
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      try {
        const response = await fetch(`/api/onlyfans/chats/${chatIdStr}/messages`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при отправке файла');
        }
        
        const data = await response.json();
        console.log('Файл успешно отправлен:', data);
        
        // После успешной отправки файла обновляем сообщения
        if (data.message) {
          // Заменяем оптимистичное сообщение с файлом на реальное
          setMessages(prev => 
            prev.map(msg => msg.id === fileOptimisticMessage.id ? data.message : msg)
          );
          
          // Обновляем кэш
          setMessageCache(prev => {
            const chatMessages = prev[chatIdStr] || [];
            return {
              ...prev,
              [chatIdStr]: chatMessages.map(msg => 
                msg.id === fileOptimisticMessage.id ? data.message : msg
              )
            };
          });
        }
      } catch (fileError) {
        console.error('Ошибка при отправке файла:', fileError);
        setError(fileError instanceof Error ? fileError.message : 'Failed to send file');
        
        // Удаляем оптимистичное сообщение с файлом
        setMessages(prev => prev.filter(msg => msg.id !== fileOptimisticMessage.id));
        setMessageCache(prev => {
          const chatMessages = prev[chatIdStr] || [];
          return {
            ...prev,
            [chatIdStr]: chatMessages.filter(msg => msg.id !== fileOptimisticMessage.id)
          };
        });
      }
    }
    
    // Сбрасываем состояние UI
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsSending(false);
    
    // Возобновляем автоматическое обновление сообщений
    isUpdatingRef.current = false;
    
    // Прокручиваем чат вниз после всех операций
    setTimeout(() => {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 200);
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
                const uniqueKey = `${message.id}-${index}`;
                
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
                disabled={isSending}
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
                disabled={isSending}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={loading || isSending || (!newMessage.trim() && !selectedFile)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isSending ? (
                  <span className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Отправка...</span>
                  </span>
                ) : 'Отправить'}
              </Button>
              <Button 
                type="button"
                onClick={handleFileSelect}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
                disabled={isSending}
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
