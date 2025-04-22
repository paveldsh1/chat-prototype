import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from 'react';
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

// Интерфейс компонента разделителя даты
interface DateSeparatorProps {
  date: string;
}

// Компонент разделителя даты между сообщениями
const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
        {date}
      </div>
    </div>
  );
};

// Функция форматирования даты для разделителя
const formatDateForSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Форматируем дату в зависимости от того, когда было отправлено сообщение
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  } else {
    // Форматирование даты в локализованном формате
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

// Функция для проверки, нужно ли показывать разделитель даты
const shouldShowDateSeparator = (currentDate: string, previousDate?: string): boolean => {
  if (!previousDate) return true; // Показываем разделитель для первого сообщения
  
  const current = new Date(currentDate);
  const previous = new Date(previousDate);
  
  // Сравниваем даты без учета времени
  return current.toDateString() !== previous.toDateString();
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
  previousMessageDate?: string; // Дата предыдущего сообщения для сравнения
  showDateSeparator?: boolean; // Флаг, показывающий, нужно ли отображать разделитель даты
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

export default function MessageItem({ message, previousMessageDate, showDateSeparator = true }: MessageProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Добавляем состояние для отображения плейсхолдера при ошибке загрузки медиа
  const [mediaLoadError, setMediaLoadError] = useState<Record<string, boolean>>({});

  // Функция для отображения плейсхолдера ошибки
  const showErrorPlaceholder = (mediaId?: string | number) => {
    if (mediaId) {
      setMediaLoadError(prev => ({
        ...prev,
        [mediaId.toString()]: true
      }));
    }
  };

  // Проверяем, нужно ли показать разделитель даты
  const needsDateSeparator = showDateSeparator && 
    shouldShowDateSeparator(message.createdAt, previousMessageDate);

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
    
    
    // Проверяем, что URL валидный
    if (!url || (typeof url === 'string' && !url.startsWith('http'))) {
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

  // Функция рендеринга медиа-элемента
  const renderMediaItem = (media: MediaItem, index: number) => {
    // Проверка наличия медиа-элемента
    if (!media) {
      console.warn('Попытка отрендерить пустой медиа-элемент');
      return null; // Не отображаем ничего
    }
    
    // Если у медиа есть ошибка загрузки, пропускаем его и возвращаем null
    const mediaId = media.id.toString();
    if (mediaLoadError[mediaId]) {
      return null;
    }
    
    // Проверка на ошибки и состояние загрузки
    if (media.hasError) {
      return null; // Не отображаем медиа с ошибками
    }
    
    if (media.isReady === false) {
      return null; // Не показываем загрузку
    }
    
    const mediaUrl = getMediaUrl(media);
    
    // Если нет URL, просто пропускаем медиа
    if (!mediaUrl) {
      return null;
    }

    // Получаем альтернативные URL для случая ошибки
    const alternatives = media.alternatives || [];
    const originalUrl = media.originalUrl || null;

    // Код для отображения медиа-контента
    if (media.type === 'photo') {
      return (
        <div className="relative" style={photoWrapperStyle}>
          {/* Показываем индикатор цены для платного контента */}
          {!message.isFree && message.price > 0 && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
              {message.price}$
            </div>
          )}
          
          {/* Содержимое медиа */}
          <img
            src={mediaUrl}
            alt="Изображение"
            style={imageStyle}
            onClick={() => openMediaViewer({ medias: message.media || [], startIndex: index })}
            onError={(e) => {
              // При ошибке загрузки скрываем элемент родителя
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) parent.style.display = 'none';
            }}
          />
        </div>
      );
    } else if (media.type === 'video') {
      return (
        <div className="relative" style={videoWrapperStyle}>
          {/* Показываем индикатор цены для платного контента */}
          {!message.isFree && message.price > 0 && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
              {message.price}$
            </div>
          )}
          
          {/* Код для отображения видео */}
          <video
            controls
            src={mediaUrl}
            style={videoStyle}
            onError={(e) => {
              // При ошибке загрузки скрываем элемент родителя
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) parent.style.display = 'none';
            }}
          ></video>
        </div>
      );
    }
    
    // Неизвестные типы не отображаем
    return null;
  };

  // Функция для открытия просмотрщика медиа
  const openMediaViewer = ({ medias, startIndex = 0 }: { medias: MediaItem[], startIndex: number }) => {
    // Открываем модальное окно с просмотрщиком медиа
    console.log('Открываю просмотрщик медиа', { medias, startIndex });
    
    // Здесь должен быть код для открытия просмотрщика,
    // но так как у нас нет доступа к хранилищу UI, просто логируем
    console.log('Медиа для просмотра:', medias);
  };
  
  // Проверяем наличие медиа в сообщении для отображения
  const hasMedia = message.media && message.media.length > 0;
  
  // Рендерим сообщение с возможным разделителем даты
  return (
    <>
      {needsDateSeparator && (
        <DateSeparator date={formatDateForSeparator(message.createdAt)} />
      )}
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
          {message.text && <p className="mb-1">{message.text}</p>}
          
          {message.media && message.media.length > 0 && (() => {
            // Собираем предварительно все рендеры медиа-элементов
            const renderedItems = message.media
              .map((mediaItem, index) => {
                const renderedItem = renderMediaItem(mediaItem, index);
                return renderedItem ? (
                  <div key={`${mediaItem.id}-${index}`} className="mb-2">
                    {renderedItem}
                  </div>
                ) : null;
              })
              .filter(Boolean); // Оставляем только не-null элементы
            
            // Если после фильтрации не осталось элементов, ничего не рендерим
            return renderedItems.length > 0 ? (
              <div className="mt-2">
                {renderedItems}
              </div>
            ) : null;
          })()}
          
          <div className={`text-xs mt-1 ${message.isFromUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {formattedTime}
          </div>
        </div>
      </div>
    </>
  );
} 