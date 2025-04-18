import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/onlyfans-api';

interface UseMediaUploadProps {
  selectedChat: number | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messageCache: Record<string, Message[]>;
  setMessageCache: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  isUpdatingRef: React.MutableRefObject<boolean>;
}

export default function useMediaUpload({
  selectedChat,
  messages,
  setMessages,
  messageCache,
  setMessageCache,
  isUpdatingRef
}: UseMediaUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaPrice, setMediaPrice] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Создаем URL для превью при выборе файла
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // Очищаем URL при размонтировании компонента
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaPrice("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMediaMessage = async (chatIdStr: string, messagesContainerRef?: React.RefObject<HTMLDivElement>) => {
    if (!selectedFile || !selectedChat) return;
    
    // Получаем цену медиа
    const price = mediaPrice ? parseFloat(mediaPrice) : 0;
    const isFree = price <= 0;
    
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
      isFree: isFree,
      price: price,
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
    // Добавляем цену, если она установлена
    if (mediaPrice) {
      formData.append('price', mediaPrice);
    }
    
    try {
      const response = await fetch(`/api/onlyfans/chats/${chatIdStr}/messages`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при отправке файла');
      }
      
      const data = await response.json();
      
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

      // Прокручиваем чат вниз после отправки файла
      if (messagesContainerRef?.current) {
        setTimeout(() => {
          messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 200);
      }
    } catch (fileError) {
      console.error('Ошибка при отправке файла:', fileError);
      
      // Удаляем оптимистичное сообщение с файлом
      setMessages(prev => prev.filter(msg => msg.id !== fileOptimisticMessage.id));
      setMessageCache(prev => {
        const chatMessages = prev[chatIdStr] || [];
        return {
          ...prev,
          [chatIdStr]: chatMessages.filter(msg => msg.id !== fileOptimisticMessage.id)
        };
      });
      
      throw fileError;
    } finally {
      clearSelectedFile();
    }
  };
  
  return {
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
  };
} 