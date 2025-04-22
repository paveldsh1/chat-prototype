import { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "@/lib/onlyfans-api";
import { getChatMessages } from "@/lib/onlyfans-api";

export default function useMessages(selectedChat: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
  const [paginationCache, setPaginationCache] = useState<Record<string, { next_id: string | null }>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);

  // Загрузка и обновление сообщений при смене выбранного чата
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    // Флаг, который будет показывать, что компонент размонтирован
    let isMounted = true;
    
    // Очищаем текущие сообщения при переключении чата
    setMessages([]);
    
    // Форматируем ID чата
    const chatIdStr = selectedChat.toString();
    
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
          
          // Прокручиваем к последнему сообщению после загрузки и рендеринга
          setTimeout(() => {
            if (messagesContainerRef.current && isMounted) {
              messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'auto'
              });
            }
          }, 100);
        }
      } catch (error) {
        console.error(`Failed to fetch messages for chat ${chatIdStr}:`, error);
        if (isMounted) {
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
      setMessages(messageCache[chatIdStr]);
      
      // Прокручиваем к последнему сообщению даже если используем кэш
      setTimeout(() => {
        if (messagesContainerRef.current && isMounted) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'auto'
          });
        }
      }, 100);
    }
    
    // Функция для обновления сообщений
    const fetchNewMessages = async () => {
      if (!isMounted) return;
      
      try {
        const response = await getChatMessages(chatIdStr);
        if (!isMounted) return;
        
        // Обновляем состояние только если компонент все еще смонтирован
        if (isMounted) {
          // Получаем актуальные сообщения из состояния и кэша
          const currentMessages = messageCache[chatIdStr] || [];
          
          // Преобразуем массив текущих сообщений в Map для более эффективной проверки
          const existingMessagesMap = new Map(currentMessages.map(msg => [msg.id, msg]));
          
          // Фильтруем новые сообщения, которых еще нет в текущем массиве сообщений
          const newMessages = response.messages.filter(msg => !existingMessagesMap.has(msg.id));
          
          if (newMessages.length > 0) {
            // Обработка медиа
            const processedNewMessages = newMessages.map(msg => ({
              ...msg,
              media: msg.media?.map(m => ({
                ...m,
                url: m.files?.full?.url || m.url || ''
              })) || []
            }));
            
            // Обновляем состояние сообщений, используя функциональное обновление и Map для дедупликации
            setMessages(prevMessages => {
              // Создаем Map из текущих сообщений для быстрого доступа
              const messagesMap = new Map(prevMessages.map(msg => [msg.id, msg]));
              
              // Добавляем новые сообщения в Map (автоматически перезаписывая дубликаты)
              processedNewMessages.forEach(msg => {
                messagesMap.set(msg.id, msg);
              });
              
              // Преобразуем Map обратно в массив и сортируем
              const uniqueMessages = Array.from(messagesMap.values());
              return uniqueMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            });
            
            // Обновляем кэш сообщений тем же способом с использованием Map
            setMessageCache(prev => {
              const cachedMessages = prev[chatIdStr] || [];
              
              // Создаем Map из кэшированных сообщений
              const messagesMap = new Map(cachedMessages.map(msg => [msg.id, msg]));
              
              // Добавляем новые сообщения в Map
              processedNewMessages.forEach(msg => {
                messagesMap.set(msg.id, msg);
              });
              
              // Преобразуем Map обратно в массив и сортируем
              const uniqueMessages = Array.from(messagesMap.values());
              const sortedMessages = uniqueMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              
              return {
                ...prev,
                [chatIdStr]: sortedMessages
              };
            });
            
            // Проверяем, находится ли пользователь в нижней части чата
            setTimeout(() => {
              if (messagesContainerRef.current && messagesContainerRef.current.scrollHeight) {
                // Определяем, находится ли пользователь близко к нижней части чата
                const scrollPosition = messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop;
                const isNearBottom = scrollPosition <= messagesContainerRef.current.clientHeight + 100; // 100px запас
                
                // Прокручиваем только если пользователь находится близко к нижней части чата
                if (isNearBottom) {
                  messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
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
    const updateMessagesWithDebounce = async () => {
      // Если запрос уже выполняется или компонент размонтирован, пропускаем
      if (isUpdatingRef.current || !isMounted) {
        return;
      }
      
      isUpdatingRef.current = true;
      
      try {
        await fetchNewMessages();
      } finally {
        // Обязательно сбрасываем флаг, даже если произошла ошибка
        if (isMounted) {
          isUpdatingRef.current = false;
        }
      }
    };
    
    const intervalId = setInterval(updateMessagesWithDebounce, 1000);
    
    // Сразу запрашиваем первый раз, не дожидаясь первого интервала
    updateMessagesWithDebounce();
    
    // Очищаем интервал при размонтировании или смене чата
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      // Сбрасываем флаг обновления
      isUpdatingRef.current = false;
    };
  }, [selectedChat]);

  // Функция загрузки более ранних сообщений
  const loadEarlierMessages = useCallback(async () => {
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
      
      // Получаем актуальные данные из состояния
      const currentMessages = messageCache[chatIdStr] || [];
      
      // Создаем Map из текущих сообщений для более эффективной проверки дубликатов
      const existingMessagesMap = new Map(currentMessages.map(m => [m.id, m]));
      
      // Фильтруем новые сообщения, которых еще нет в текущих
      const uniqueNewMessages = processedMessages.filter(msg => !existingMessagesMap.has(msg.id));
      
      if (uniqueNewMessages.length === 0) {
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
      
      // Обновляем сообщения, используя Map для дедупликации
      setMessages(prevMessages => {
        // Создаем Map из текущих сообщений
        const messagesMap = new Map(prevMessages.map(msg => [msg.id, msg]));
        
        // Добавляем новые сообщения в Map (автоматически перезаписывая дубликаты)
        uniqueNewMessages.forEach(msg => {
          messagesMap.set(msg.id, msg);
        });
        
        // Преобразуем Map обратно в массив и сортируем
        const uniqueMessages = Array.from(messagesMap.values());
        return uniqueMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      
      // Обновляем кэш сообщений тем же способом
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        
        // Создаем Map из кэшированных сообщений
        const messagesMap = new Map(chatMessages.map(msg => [msg.id, msg]));
        
        // Добавляем новые сообщения в Map
        uniqueNewMessages.forEach(msg => {
          messagesMap.set(msg.id, msg);
        });
        
        // Преобразуем Map обратно в массив и сортируем
        const uniqueMessages = Array.from(messagesMap.values());
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
    } finally {
      if (isComponentMounted) {
        setLoadingMore(false);
        // Разблокируем автоматическое обновление сообщений
        isUpdatingRef.current = false;
      }
    }
  }, [selectedChat, loadingMore, paginationCache, messageCache]);

  // Обработчик скролла для загрузки более ранних сообщений
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    
    // Если скроллим вверх и находимся вблизи верха контейнера
    if (container.scrollTop < 100 && !loadingMore && selectedChat) {
      loadEarlierMessages();
    }
  }, [loadingMore, selectedChat, loadEarlierMessages]);

  return {
    messages,
    loading,
    loadingMore,
    messageCache,
    paginationCache,
    messagesContainerRef,
    isUpdatingRef,
    handleScroll,
    loadEarlierMessages,
    setMessages,
    setMessageCache
  };
} 