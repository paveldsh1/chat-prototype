import React from 'react';
import { MessageData, MessageMedia } from '@/types/message';
import { MessageImage } from './MessageImage';
import { VideoPlayer } from './VideoPlayer';

interface MessageContentProps {
  message: MessageData;
}

export const MessageContent: React.FC<MessageContentProps> = ({ message }) => {
  // Функция для отображения медиа-элемента
  const renderMediaItem = (media: MessageMedia, index: number) => {
    if (!media || media.hasError) {
      return null;
    }
    
    if (media.isReady === false) {
      return null;
    }
    
    // Определяем тип медиа и выбираем соответствующий компонент
    if (media.type === 'photo') {
      // Передаем обработчик клика, если он определен
      return (
        <MessageImage 
          key={`media-${media.id}`} 
          media={media} 
          onClick={media.onClick} 
        />
      );
    }
    
    if (media.type === 'video') {
      return <VideoPlayer key={`media-${media.id}`} media={media} />;
    }
    
    // Для других типов возвращаем null
    return null;
  };
  
  return (
    <div className="space-y-2">
      {/* Текст сообщения */}
      {message.text && <p className="mb-1">{message.text}</p>}
      
      {/* Медиа-контент */}
      {message.media && message.media.length > 0 && (
        <div className="mt-2 space-y-2">
          {message.media.map((mediaItem, index) => 
            renderMediaItem(mediaItem, index)
          )}
        </div>
      )}
    </div>
  );
}; 