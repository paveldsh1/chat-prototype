import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactElement } from 'react';
import Image from 'next/image';
import { CSSProperties } from 'react';

// Стили для медиа-контейнеров
const mediaWrapperStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  borderRadius: '0.375rem',
  overflow: 'hidden',
};

const photoWrapperStyle: CSSProperties = {
  ...mediaWrapperStyle,
  maxHeight: '400px',
  backgroundColor: '#f8f9fa',
};

const videoWrapperStyle: CSSProperties = {
  ...mediaWrapperStyle,
  maxHeight: '400px', 
  backgroundColor: '#f8f9fa',
};

const imageStyle: CSSProperties = {
  maxWidth: '100%',
  maxHeight: '400px',
  width: 'auto',
  objectFit: 'contain',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

const videoStyle: CSSProperties = {
  maxWidth: '100%',
  maxHeight: '400px',
  width: 'auto',
  borderRadius: '0.375rem',
};

interface MessageProps {
  message: {
    id: string;
    text: string;
    fromUser: {
      id: string;
      name: string;
      username: string;
      avatar: string | null;
    };
    mediaType: string | null;
    mediaUrl: string | null;
    createdAt: string;
    isFromUser: boolean;
    price: number;
    isFree: boolean;
    isOpened: boolean;
    mediaCount?: number; // Добавляем поле mediaCount для поддержки API OnlyFans
    isMediaReady?: boolean; // Флаг готовности медиа из API
    alternativeMediaUrls?: string[]; // Альтернативные URL для видео и изображений
    originalMediaUrl?: string | null; // Оригинальный URL для видео и изображений
    media?: Array<MediaItem>;
  };
}

// Интерфейс для медиа-элементов
interface MediaItem {
  id: string | number;
  type: string;
  url?: string;
  isReady?: boolean; // Флаг готовности отдельного медиа-элемента
  hasError?: boolean; // Флаг ошибки медиа-элемента
  files?: {
    full?: {
      url: string | null;
      width?: number;
      height?: number;
    };
    thumb?: {
      url: string | null;
    };
    preview?: {
      url: string | null;
    };
    squarePreview?: {
      url: string | null;
    };
  };
  canView?: boolean;
  duration?: number;
  videoSources?: {
    "720"?: string | null;
    "240"?: string | null;
  };
  alternatives?: string[]; // Альтернативные URL для видео и изображений
  originalUrl?: string | null; // Оригинальный URL для видео и изображений
}

/**
 * Функция для проксирования URL через наш сервер
 */
function proxyImageUrl(url: string): string {
  if (!url) return '';
  
  // Чистим URL от экранированных слешей
  url = url.replace(/\\\//g, '/');
  
  // Проверяем, что URL валидный
  if (!url.startsWith('http')) {
    console.error('Invalid URL in proxyImageUrl:', url);
    return '';
  }
  
  // Просто возвращаем исходный URL без проксирования
  return url;
}

/**
 * Получение URL для медиа-файла
 */
function getMediaFileUrl(media: MediaItem | undefined): string {
  if (!media || !media.canView || media.hasError) {
    return '';
  }
  
  // Предпочитаем видеоисточник для лучшего качества (исправлено - используем full вместо source)
  if (media.type === 'video' && media.files?.full?.url) {
    const url = media.files.full.url;
    // Для видео проксирование может не потребоваться, оставляем как есть
    return url ? url.replace(/\\\//g, '/') : '';
  }
  
  // Для изображений больше не используем прокси
  if (media.type === 'photo' && media.files?.full?.url) {
    const url = media.files.full.url;
    return url ? url.replace(/\\\//g, '/') : '';
  }
  
  return '';
}

/**
 * Получение URL для миниатюры
 */
function getThumbFileUrl(media: MediaItem): string {
  if (!media || !media.files) return '';
  
  // Получаем URL миниатюры из различных источников
  let url = media.files?.thumb?.url || 
         media.files?.squarePreview?.url || 
         media.files?.preview?.url || 
         '';
  
  // Очищаем URL от экранированных слешей
  if (url && typeof url === 'string' && url.includes('\\/')) {
    url = url.replace(/\\\//g, '/');
  }
  
  // Если URL начинается с http, считаем его валидным
  if (url && !url.startsWith('http')) {
    console.error('Invalid thumb URL:', url);
    return '';
  }
  
  // Больше не проксируем URL
  return url;
}

// Компонент для отображения плейсхолдера медиа (загрузка или ошибка)
interface MediaPlaceholderProps {
  loading?: boolean;
  error?: boolean;
  message: string;
}

const MediaPlaceholder: React.FC<MediaPlaceholderProps> = ({ loading, error, message }) => {
  const bgClass = error ? 'bg-red-50' : 'bg-gray-100';
  const textClass = error ? 'text-red-500' : 'text-gray-500';
  
  return (
    <div className={`rounded p-4 text-center ${bgClass}`}>
      <div className={`flex flex-col items-center ${textClass}`}>
        {loading ? (
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : error ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ) : null}
        <span className="mt-2">{message}</span>
      </div>
    </div>
  );
};

export default function MessageItem({ message }: MessageProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Отладочное логирование
  console.log(`Rendering MessageItem, has media: ${Boolean(message.media?.length)}`);
  if (message.media && message.media.length > 0) {
    console.log('Media items:', JSON.stringify(message.media, null, 2));
    
    // Дополнительно логируем данные первого медиа-элемента для детального анализа
    if (message.media[0]) {
      console.log('First media item files:', message.media[0].files);
      console.log('First media type:', message.media[0].type);
      console.log('First media canView:', message.media[0].canView);
      console.log('First media URL used:', message.media[0].files?.full?.url || message.media[0].url || 'нет URL');
    }
  }

  // Получаем наилучший доступный URL медиа-файла
  const getMediaUrl = (media: MediaItem) => {
    // Если явно указано, что медиа недоступно или есть ошибка
    if (media.canView === false || media.hasError === true) return null;
    
    // Если медиа не готово, возвращаем null
    if (media.isReady === false) return null;
    
    // Получаем URL из всех возможных источников
    let url = '';
    
    // Предпочтение источникам видео для лучшего качества
    if (media.type === 'video' && media.videoSources && media.videoSources['720']) {
      url = media.videoSources['720'];
    } else {
      // Получаем URL и очищаем от экранированных слешей, если они есть
      url = media.url || 
            media.files?.full?.url || 
            media.files?.preview?.url || 
            media.files?.squarePreview?.url || 
            media.files?.thumb?.url || 
            '';
    }
    
    // Логируем URL для отладки
    console.log(`Media URL for ${media.id}: ${url || 'нет URL'}`);
    
    // Проверяем, что URL валидный
    if (!url || (typeof url === 'string' && !url.startsWith('http'))) {
      console.warn(`Invalid media URL for ${media.id}: ${url}`);
      return null;
    }
    
    // Чистим URL от экранированных слешей
    if (typeof url === 'string' && url.includes('\\/')) {
      url = url.replace(/\\\//g, '/');
    }
    
    return url;
  };

  // Проверяем, доступно ли медиа для показа
  const isMediaAccessible = (media: MediaItem) => {
    return media && 
           media.hasError !== true && 
           media.canView !== false &&
           getMediaUrl(media) !== null;
  };

  // Получаем плейсхолдер в зависимости от типа медиа
  const getPlaceholderElement = (mediaType: string) => {
    // Дефолтный текст для разных типов медиа
    const mediaTypeText: Record<string, string> = {
      'photo': 'Изображение',
      'video': 'Видео',
      'gif': 'GIF-анимация',
      'audio': 'Аудиозапись',
      'document': 'Документ'
    };
    
    const typeLabel = mediaTypeText[mediaType] || 'Медиа';
    
    return (
      <div className="bg-gray-100 text-gray-400 p-4 rounded text-center">
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
          </svg>
          <span className="mt-2">{typeLabel} недоступно</span>
        </div>
      </div>
    );
  };

  const handleProxyError = async (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>, 
    mediaUrl: string | null, 
    alternatives: string[] = [], 
    originalUrl: string | null = null, 
    showPlaceholder: () => void
  ) => {
    // Логируем ошибку загрузки
    console.error('Failed to load media:', e, 'URL:', mediaUrl);
    
    const target = e.currentTarget;
    const src = target.getAttribute('src');
    
    // Если нет URL, показываем плейсхолдер
    if (!src) {
      console.warn('No source URL to retry with');
      showPlaceholder();
      return;
    }
    
    // Экстрактим оригинальный URL из прокси URL, если это возможно
    const extractedOriginalUrl = extractOriginalUrl(src);
    if (extractedOriginalUrl) {
      console.log('Extracted original URL:', extractedOriginalUrl);
      originalUrl = extractedOriginalUrl;
    }
    
    // Пробуем найти альтернативные URL
    tryFindAlternativeUrl(alternatives, originalUrl, showPlaceholder);
  };
    
    const extractOriginalUrl = (proxyUrl: string): string | null => {
      try {
        // Если в URL есть encoded параметр, извлекаем его
        if (proxyUrl.includes('encoded=')) {
          const encodedParam = new URL(proxyUrl).searchParams.get('encoded');
          if (encodedParam) {
            return decodeURIComponent(encodedParam);
          }
        }
        
        return null;
      } catch (e) {
        console.error('Error extracting original URL:', e);
        return null;
      }
    };
    
    const tryFindAlternativeUrl = (alternatives: string[], originalUrl: string | null, showPlaceholder: () => void) => {
      // Объединяем все возможные URL для повторных попыток
      const allUrls: string[] = [];
      
      // Добавляем альтернативные URL
      if (alternatives && alternatives.length > 0) {
        alternatives.forEach(url => {
          if (url && typeof url === 'string' && url.startsWith('http')) {
            allUrls.push(url);
          }
        });
      }
      
      // Добавляем оригинальный URL
      if (originalUrl && originalUrl.startsWith('http')) {
        allUrls.push(originalUrl);
      }
      
      console.log('Alternative URLs to try:', allUrls);
      
      // Если есть URL для повторной попытки, пробуем их по очереди
      if (allUrls.length > 0) {
        tryNextUrl(allUrls, 0, showPlaceholder);
      } else {
        // Если нет альтернативных URL, показываем плейсхолдер
        showPlaceholder();
      }
    };
    
    const tryNextUrl = (urls: string[], index: number, showPlaceholder: () => void) => {
      if (index >= urls.length) {
        console.warn('All alternative URLs failed, showing placeholder');
        showPlaceholder();
        return;
      }
      
      const url = urls[index];
      console.log(`Trying alternative URL ${index + 1}/${urls.length}:`, url);
      
      // Создаем тестовое изображение для проверки URL
      const testImg = document.createElement('img');
      testImg.onload = () => {
        console.log(`Alternative URL ${index + 1} loaded successfully:`, url);
        // Обновляем src у всех изображений и видео с этим URL
        document.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img[data-retry="true"], video[data-retry="true"]')
          .forEach(el => {
            if (el.getAttribute('data-original-url') === url || !el.getAttribute('data-original-url')) {
              console.log('Updating element with new URL:', url, el);
              el.setAttribute('src', url);
              el.removeAttribute('data-retry');
            }
          });
      };
      
      testImg.onerror = () => {
        console.warn(`Alternative URL ${index + 1} failed to load:`, url);
        // Пробуем следующий URL
        tryNextUrl(urls, index + 1, showPlaceholder);
      };
      
      testImg.src = url;
    };

  // Функция для отображения плейсхолдера вместо видео
  const showVideoPlaceholder = (videoElement: HTMLVideoElement) => {
    console.log('Показываю плейсхолдер для видео');
    
    // Создаем плейсхолдер
    const placeholder = document.createElement('div');
    placeholder.className = 'bg-gray-100 rounded p-4 text-center text-gray-500';
    placeholder.innerHTML = `
      <div class="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
        </svg>
        <span class="mt-2">Видео недоступно</span>
      </div>
    `;
    
    // Заменяем видео на плейсхолдер
    const parent = videoElement.parentElement;
    if (parent) {
      parent.replaceChild(placeholder, videoElement);
    }
  };

  // Функция рендеринга медиа-элемента
  const renderMediaItem = (media: MediaItem, index: number) => {
    // Проверка наличия медиа-элемента
    if (!media) {
      console.warn('Попытка отрендерить пустой медиа-элемент');
      return <MediaPlaceholder error message="Медиа-элемент не найден" />;
    }
    
    // Расширенное логирование для медиа
    console.log(`Рендеринг медиа ${index}:`, {
      тип: media.type,
      готово: media.isReady,
      ошибка: media.hasError,
      url: getMediaUrl(media)
    });

    // Проверка на ошибки и состояние загрузки
    if (media.hasError) {
      return <MediaPlaceholder error message="Ошибка загрузки медиа" />;
    }
    
    if (media.isReady === false) {
      return <MediaPlaceholder loading message="Медиа загружается..." />;
    }
    
    const mediaUrl = getMediaUrl(media);
    
    // Проверяем наличие URL
    if (!mediaUrl) {
      return <MediaPlaceholder error message="URL медиа недоступен" />;
    }

    // Рендерим в зависимости от типа медиа
    if (media.type === 'photo') {
      return (
        <div style={photoWrapperStyle}>
          <img
            src={mediaUrl}
            alt="Изображение из сообщения"
            style={imageStyle}
            loading="lazy"
            onClick={() => media.canView !== false && openMediaViewer({ medias: message.media || [], startIndex: index })}
            onError={(e) => {
              // Если изображение не загрузилось, скрываем его
              (e.target as HTMLImageElement).style.display = 'none';
              
              // Показываем плейсхолдер вместо сломанного изображения
              const imgEl = e.target as HTMLImageElement;
              showImagePlaceholder(imgEl);
            }}
          />
        </div>
      );
    } else if (media.type === 'video') {
      return (
        <div style={videoWrapperStyle}>
          <video
            src={mediaUrl}
            controls
            style={videoStyle}
            playsInline
            poster={getThumbFileUrl(media)}
            onError={(e) => {
              // Если видео не загрузилось, скрываем его
              (e.target as HTMLVideoElement).style.display = 'none';
              
              // Показываем плейсхолдер вместо сломанного видео
              const videoEl = e.target as HTMLVideoElement;
              showVideoPlaceholder(videoEl);
            }}
          />
        </div>
      );
    }

    // Для неподдерживаемых типов показываем заглушку
    return getPlaceholderElement(media.type);
  };

  // Функция для открытия просмотрщика медиа
  const openMediaViewer = ({ medias, startIndex = 0 }: { medias: MediaItem[], startIndex: number }) => {
    // Открываем модальное окно с просмотрщиком медиа
    console.log('Открываю просмотрщик медиа', { medias, startIndex });
    
    // Здесь должен быть код для открытия просмотрщика,
    // но так как у нас нет доступа к хранилищу UI, просто логируем
    console.log('Медиа для просмотра:', medias);
  };
  
  // Рендерим сообщение
  return (
    <div className={`flex mb-4 ${message.isFromUser ? 'justify-end' : 'justify-start'}`}>
      {!message.isFromUser && (
        <div className="mr-2 flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.fromUser.avatar || ''} />
            <AvatarFallback>{message.fromUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={`relative max-w-[75%] ${message.isFromUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-2 shadow`}>
        {!message.isFree && message.price > 0 && (
          <div className="absolute -top-5 right-0 bg-yellow-400 text-xs text-black font-semibold px-2 py-0.5 rounded-full">
            ${message.price.toFixed(2)}
          </div>
        )}
        
        {message.text && <p className="mb-1">{message.text}</p>}
        
        {message.media && message.media.length > 0 && (
          <div className="mt-2">
            {message.media.map((mediaItem, index) => (
              <div key={`${mediaItem.id}-${index}`} className="mb-2">
                {renderMediaItem(mediaItem, index)}
              </div>
            ))}
          </div>
        )}
        
        <div className={`text-xs mt-1 ${message.isFromUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
}

// Функция для отображения плейсхолдера вместо изображения
const showImagePlaceholder = (imgElement: HTMLImageElement) => {
  console.log('Показываю плейсхолдер для изображения');
  
  // Создаем плейсхолдер
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-gray-100 rounded p-4 text-center text-gray-500';
  placeholder.innerHTML = `
    <div class="flex flex-col items-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      <span class="mt-2">Изображение недоступно</span>
    </div>
  `;
  
  // Заменяем изображение на плейсхолдер
  const parent = imgElement.parentElement;
  if (parent) {
    parent.replaceChild(placeholder, imgElement);
  }
}; 