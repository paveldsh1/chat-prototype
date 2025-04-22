'use client';

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChatSidebar, ChatHeader, MessageList, MessageInput } from "@/components/chat";
import { useChats, useMessages, useMediaUpload, useMessageSender } from "@/hooks";

export default function Home() {
  // Хук для управления списком чатов и авторизацией
  const { 
    chats, 
    selectedChat, 
    loading: chatLoading, 
    loadingChats, 
    error, 
    account, 
    authChecking, 
    initializationProgress, 
    setSelectedChat,
    setError
  } = useChats();

  // Хук для управления сообщениями
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    messageCache,
    paginationCache,
    messagesContainerRef,
    isUpdatingRef,
    handleScroll,
    setMessages,
    setMessageCache
  } = useMessages(selectedChat);

  // Хук для отправки текстовых сообщений
  const {
    newMessage,
    setNewMessage,
    sendTextMessage
  } = useMessageSender({
    selectedChat,
    messages,
    setMessages,
    messageCache,
    setMessageCache,
    isUpdatingRef
  });

  // Хук для загрузки и отправки медиафайлов
  const {
    selectedFile,
    setSelectedFile,
    previewUrl,
    setPreviewUrl,
    mediaPrice,
    setMediaPrice,
    isSending,
    setIsSending,
    fileInputRef,
    clearSelectedFile,
    sendMediaMessage
  } = useMediaUpload({
    selectedChat,
    messages,
    setMessages,
    messageCache,
    setMessageCache,
    isUpdatingRef
  });

  // Обработчик отправки сообщений (текст + медиа)
  const handleSendMessage = async () => {
    if (!selectedChat || (!newMessage.trim() && !selectedFile)) return;
    
    setIsSending(true);
    
    try {
      // Временно отключаем автоматическое обновление сообщений
      isUpdatingRef.current = true;
      
      // Если есть текстовое сообщение, отправляем его
      if (newMessage.trim()) {
        await sendTextMessage(messagesContainerRef as React.RefObject<HTMLDivElement>);
      }
      
      // Если выбран файл, отправляем его
      if (selectedFile) {
        await sendMediaMessage(selectedChat.toString(), messagesContainerRef as React.RefObject<HTMLDivElement>);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      // Сбрасываем состояние UI
      clearSelectedFile();
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
    }
  };

  // Страница инициализации и загрузки
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

  // Страница ошибки авторизации
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

  // Основной интерфейс приложения
  return (
    <div className="flex h-screen">
      {/* Боковая панель с чатами */}
      <ChatSidebar
        account={account}
        chats={chats}
        loadingChats={loadingChats}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        error={error}
        paginationCache={paginationCache}
      />

      {/* Область сообщений */}
      <div className="flex-1 flex flex-col h-screen">
        <ChatHeader
          selectedChat={selectedChat}
          chats={chats}
        />
        
        <MessageList
          messages={messages}
          loading={messagesLoading}
          loadingMore={loadingMore}
          selectedChat={selectedChat}
          chats={chats}
          messagesContainerRef={messagesContainerRef as React.RefObject<HTMLDivElement>}
          onScroll={handleScroll}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          previewUrl={previewUrl}
          setPreviewUrl={setPreviewUrl}
          mediaPrice={mediaPrice}
          setMediaPrice={setMediaPrice}
          isSending={isSending}
        />
      </div>
    </div>
  );
}
