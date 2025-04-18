import React, { useState, useEffect } from 'react';
import { MessageMedia } from '@/types/message';
import { MediaPlaceholder } from './MediaPlaceholder';

interface VideoPlayerProps {
  media: MessageMedia;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ media, className = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  
  // Получаем URL видео при изменении пропса media
  useEffect(() => {
    const getVideoUrl = () => {
      // Пробуем получить URL из разных источников в порядке приоритета
      
      // 1. Предпочитаем видео высокого качества
      if (media.videoSources && media.videoSources['720']) {
        return media.videoSources['720'];
      }
      
      // 2. Пробуем URL из low quality
      if (media.videoSources && media.videoSources['240']) {
        return media.videoSources['240'];
      }
      
      // 3. Простой URL
      if (media.url) {
        return media.url;
      }
      
      // 4. URL из files
      if (media.files?.full?.url) {
        return media.files.full.url;
      }
      
      return null;
    };
    
    const url = getVideoUrl();
    if (url) {
      // Очищаем URL от экранированных слешей
      const cleanUrl = url.replace(/\\\//g, '/');
      setVideoSrc(cleanUrl);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [media]);
  
  if (!videoSrc) {
    return <MediaPlaceholder error message="Видео недоступно" />;
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      {(loading || error) && (
        <div className="absolute inset-0 z-10">
          <MediaPlaceholder 
            loading={loading} 
            error={error} 
            message={loading ? "Загрузка видео..." : "Ошибка загрузки"} 
          />
        </div>
      )}
      
      <video
        className={`w-full rounded ${error ? 'hidden' : ''}`}
        controls
        preload="metadata"
        onLoadStart={() => setLoading(true)}
        onLoadedData={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      >
        <source src={videoSrc} />
        Ваш браузер не поддерживает видео
      </video>
    </div>
  );
}; 