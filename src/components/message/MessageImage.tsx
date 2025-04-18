import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MessageMedia } from '@/types/message';
import { MediaPlaceholder } from './MediaPlaceholder';

interface MessageImageProps {
  media: MessageMedia;
  className?: string;
  onClick?: () => void;
}

export const MessageImage: React.FC<MessageImageProps> = ({ 
  media, 
  className = '',
  onClick 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  // Получаем лучший доступный URL для изображения
  useEffect(() => {
    const getImageUrl = () => {
      // Предпочитаем URL из media.url
      if (media.url) {
        return media.url;
      }
      
      // Затем проверяем files.full
      if (media.files?.full?.url) {
        return media.files.full.url;
      }
      
      // Затем другие возможные источники
      if (media.files?.preview?.url) {
        return media.files.preview.url;
      }
      
      if (media.files?.squarePreview?.url) {
        return media.files.squarePreview.url;
      }
      
      if (media.files?.thumb?.url) {
        return media.files.thumb.url;
      }
      
      return null;
    };
    
    const imageUrl = getImageUrl();
    if (imageUrl) {
      // Очищаем URL от экранированных слешей, если они есть
      const cleanUrl = imageUrl.replace(/\\\//g, '/');
      setImgSrc(cleanUrl);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [media]);
  
  // Если нет URL изображения, показываем плейсхолдер
  if (!imgSrc) {
    return <MediaPlaceholder error message="Изображение недоступно" />;
  }

  // Генерируем уникальный ключ для кэширования
  const cacheKey = media.id.toString() + (media.url || media.files?.full?.url || '');

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      {(loading || error) && (
        <div className="absolute inset-0 z-10">
          <MediaPlaceholder 
            loading={loading} 
            error={error} 
            message={loading ? "Загрузка..." : "Ошибка загрузки"} 
          />
        </div>
      )}
      
      <img
        src={imgSrc}
        alt="Изображение сообщения"
        className={`w-full h-auto max-h-96 object-contain rounded ${error ? 'hidden' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />
    </div>
  );
}; 