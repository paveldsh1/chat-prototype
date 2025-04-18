import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageItemProps, MessageMedia } from '@/types/message';
import { MessageDateSeparator, shouldShowDateSeparator, formatDateForSeparator } from './MessageDateSeparator';
import { MessageContent } from './MessageContent';

interface MediaViewerProps {
  media: MessageMedia[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

// Простая галерея для просмотра изображений
const MediaViewer: React.FC<MediaViewerProps> = ({ 
  media, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrev 
}) => {
  const currentMedia = media[currentIndex];
  
  if (!currentMedia) return null;
  
  const getMediaUrl = (media: MessageMedia) => {
    if (media.url) return media.url;
    if (media.files?.full?.url) return media.files.full.url;
    return '';
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div className="relative max-w-full max-h-full p-2" onClick={e => e.stopPropagation()}>
        {/* Кнопка закрытия */}
        <button 
          className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 rounded-full p-2"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Навигационные кнопки */}
        {media.length > 1 && (
          <>
            <button 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2"
              onClick={onPrev}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2"
              onClick={onNext}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}
        
        {/* Содержимое в зависимости от типа медиа */}
        {currentMedia.type === 'photo' ? (
          <img 
            src={getMediaUrl(currentMedia)} 
            alt="Изображение" 
            className="max-w-full max-h-[80vh] object-contain"
          />
        ) : currentMedia.type === 'video' ? (
          <video 
            src={getMediaUrl(currentMedia)} 
            controls 
            className="max-w-full max-h-[80vh]"
          />
        ) : null}
        
        {/* Счетчик */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  previousMessageDate,
  showDateSeparator = true 
}) => {
  // Состояние для просмотрщика медиа
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  
  // Форматируем время отображения
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Проверяем, нужно ли показать разделитель даты
  const needsDateSeparator = showDateSeparator && 
    shouldShowDateSeparator(message.createdAt, previousMessageDate);
  
  // Обработчики для просмотрщика медиа
  const handleOpenMediaViewer = (index: number) => {
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
  };
  
  const handleCloseMediaViewer = () => {
    setShowMediaViewer(false);
  };
  
  const handleNextMedia = () => {
    if (message.media && message.media.length > 0) {
      setMediaViewerIndex((prevIndex) => (prevIndex + 1) % message.media!.length);
    }
  };
  
  const handlePrevMedia = () => {
    if (message.media && message.media.length > 0) {
      setMediaViewerIndex((prevIndex) => 
        prevIndex === 0 ? message.media!.length - 1 : prevIndex - 1
      );
    }
  };

  return (
    <>
      {needsDateSeparator && (
        <MessageDateSeparator date={formatDateForSeparator(message.createdAt)} />
      )}
      
      <div className={`flex mb-4 ${message.isFromUser ? 'justify-end' : 'justify-start'}`}>
        {/* Аватар для сообщений от других пользователей */}
        {!message.isFromUser && (
          <div className="mr-2 flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.fromUser.avatar || ''} />
              <AvatarFallback>{message.fromUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {/* Содержимое сообщения */}
        <div className={`relative max-w-[75%] ${
          message.isFromUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        } rounded-lg px-4 py-2 shadow`}>
          {/* Отображаем содержимое сообщения (текст и медиа) */}
          <MessageContent 
            message={{
              ...message,
              media: message.media?.map((media, index) => ({
                ...media,
                onClick: () => handleOpenMediaViewer(index)
              }))
            }} 
          />
          
          {/* Время отправки сообщения */}
          <div className={`text-xs ${
            message.isFromUser ? 'text-blue-100' : 'text-gray-500'
          } text-right mt-1`}>
            {formattedTime}
          </div>
        </div>
      </div>
      
      {/* Отображаем просмотрщик медиа в режиме полноэкранного просмотра */}
      {showMediaViewer && message.media && message.media.length > 0 && (
        <MediaViewer 
          media={message.media}
          currentIndex={mediaViewerIndex}
          onClose={handleCloseMediaViewer}
          onNext={handleNextMedia}
          onPrev={handlePrevMedia}
        />
      )}
    </>
  );
};

export default MessageItem; 