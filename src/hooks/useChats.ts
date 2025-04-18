import { useState, useEffect } from "react";
import { Chat, AccountInfo } from "@/lib/onlyfans-api";
import { getChats, checkAuth } from "@/lib/onlyfans-api";

export default function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [initializationProgress, setInitializationProgress] = useState(0);

  // Загрузка данных при инициализации
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
        
        // Шаг 2: Загрузка списка чатов (100%)
        const chatList = await getChats();
        if (!Array.isArray(chatList)) {
          throw new Error('Chat list must be an array');
        }
        setChats(chatList);
        
        // Убираем автоматический выбор первого чата
        setSelectedChat(null);
        setInitializationProgress(100);
        
      } catch (error) {
        console.error('Initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      } finally {
        setAuthChecking(false);
        setLoadingChats(false);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Обработчик выбора чата
  const handleSelectChat = (chatId: number) => {
    setSelectedChat(chatId);
  };

  return {
    chats,
    selectedChat,
    loading,
    loadingChats,
    error,
    account,
    authChecking,
    initializationProgress,
    setSelectedChat: handleSelectChat,
    setError
  };
} 