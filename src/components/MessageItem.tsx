import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import classNames from 'classnames';
import Image from 'next/image';
import { PhotoIcon, PlayIcon, ArrowDownTrayIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Message } from '@/types/messages';
import { createRoot } from 'react-dom/client';
import { extractIpFromUrl, normalizeUrl } from '../utils/mediaUtils';

/**
 * Интерфейс для описания структуры медиа-элемента
 */
interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'file';
  url: string;
  thumbUrl?: string;
  isReady: boolean;
  hasError: boolean;
  files?: {
    full?: { url: string };
    preview?: { url: string };
    squarePreview?: { url: string };
    thumb?: { url: string };
  };
  canView: boolean;
  duration?: number;
  videoSources?: string[];
  alternatives?: string[];
  originalUrl?: string;
}

/**
 * Интерфейс для ошибок медиа
 */
interface MediaError {
  type: 'generic' | 'cors' | 'ip_restricted' | 'unknown';
  message: string;
  url?: string;
}

/**
 * Интерфейс для пропсов компонента сообщения
 */
interface MessageProps {
  message: Message;
  isMarkdown?: boolean;
}

/**
 * Проверяет наличие ограничений по IP в URL
 */
export function checkUrlIpRestrictions(url: string | null | undefined): {
  hasIpRestriction: boolean;
  requiredIp?: string;
} {
  if (!url) return { hasIpRestriction: false };
  
  try {
    // Ищем IP-адрес в URL с помощью регулярного выражения
    const ipMatch = url.match(/IpAddress.*AWS:SourceIp":"([^"\/]+)/i);
    const ipValue = ipMatch && ipMatch[1];
    
    if (ipValue) {
      console.log(`[IP restriction] Обнаружено ограничение по IP: ${ipValue}`);
      return { 
        hasIpRestriction: true,
        requiredIp: ipValue
      };
    }
    
    // Вторая попытка найти IP в формате IpAddress=IP
    const simpleIpMatch = url.match(/IpAddress=([0-9.]+)/i);
    const simpleIpValue = simpleIpMatch && simpleIpMatch[1];
    
    if (simpleIpValue) {
      console.log(`[IP restriction] Обнаружено ограничение по IP: ${simpleIpValue}`);
      return { 
        hasIpRestriction: true,
        requiredIp: simpleIpValue
      };
    }
    
    // Проверка на ключевое слово IpAddress или другие признаки
    if (url.includes('IpAddress') || url.includes('AWS:SourceIp')) {
      console.log('[IP restriction] Обнаружено ограничение по IP, но не удалось извлечь адрес');
      return { hasIpRestriction: true };
    }
  } catch (error) {
    console.error('[IP restriction] Ошибка при проверке ограничений IP:', error);
  }
  
  return { hasIpRestriction: false };
}

/**
 * Проксирует URL изображения с учетом требуемого IP-адреса
 */
export function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  try {
    // Проверяем, является ли URL от OnlyFans
    const isOnlyFans = url.includes('onlyfans.com') || 
                       url.includes('cdn.onlyfns.com') || 
                       url.includes('onfons.com');
    
    // Если это не OnlyFans URL, возвращаем исходный URL
    if (!isOnlyFans) return url;
    
    // Извлекаем IP из URL, если он там есть в формате IpAddress
    const ipMatch = url.match(/"IpAddress".*?"AWS:SourceIp"\s*:\s*"([^"\/]+)"/);
    let extractedIp: string | null = null;
    
    if (ipMatch && ipMatch[1]) {
      extractedIp = ipMatch[1].replace(/\\\/\d+$/, ''); // Удаляем маску подсети если есть
      console.log(`[Proxy] Извлечен IP из URL: ${extractedIp}`);
    }
    
    // Создаем URL для прокси-сервера
    const apiUrl = new URL('/api/onlyfans/proxy', window.location.origin);
    apiUrl.searchParams.set('url', url);
    
    // Если нашли IP, добавляем его в запрос
    if (extractedIp) {
      apiUrl.searchParams.set('ip', extractedIp);
    }
    
    console.log(`[Proxy] Проксирование URL: ${url.substring(0, 50)}...`);
    return apiUrl.toString();
  } catch (error) {
    console.error('[Proxy] Ошибка при создании прокси-URL:', error);
    return url;
  }
}

/**
 * Получает URL медиа файла с учетом доступности и ошибок
 */
function getMediaFileUrl(media: MediaItem | undefined, accessible?: boolean, hasError?: boolean): string | undefined {
  if (!media) return undefined;
  if (hasError) return undefined;
  if (accessible === false) return undefined;
  
  // Если это OnlyFans URL, проксируем его
  if (media.url && (
      media.url.includes('onlyfans.com') || 
      media.url.includes('cdn.onlyfns.com') || 
      media.url.includes('onfons.com')
    )) {
    return proxyImageUrl(media.url);
  }
  
  return normalizeUrl(media.url) || undefined;
}

/**
 * Получает URL миниатюры медиа файла с учетом доступности и ошибок
 */
function getThumbFileUrl(media: MediaItem | undefined, accessible?: boolean, hasError?: boolean): string | undefined {
  if (!media) return undefined;
  if (hasError) return undefined;
  if (accessible === false) return undefined;
  
  // Проверяем, является ли thumbUrl от OnlyFans
  if (media.thumbUrl && (
      media.thumbUrl.includes('onlyfans.com') || 
      media.thumbUrl.includes('cdn.onlyfns.com') || 
      media.thumbUrl.includes('onfons.com')
    )) {
    return proxyImageUrl(media.thumbUrl);
  }
  
  // Если нет thumbUrl, попробуем взять из files
  if (media.files?.thumb?.url && (
      media.files.thumb.url.includes('onlyfans.com') || 
      media.files.thumb.url.includes('cdn.onlyfns.com') || 
      media.files.thumb.url.includes('onfons.com')
    )) {
    return proxyImageUrl(media.files.thumb.url);
  }

  // Возвращаем thumbUrl или из files, если они есть
  return normalizeUrl(media.thumbUrl || media.files?.thumb?.url) || undefined;
}

/**
 * Показывает плейсхолдер для медиа
 */
function showMediaPlaceholder(message: Message): ReactElement {
  // Определяем, является ли медиа OnlyFans
  const isOnlyFans = message.mediaUrl && 
    (message.mediaUrl.includes('onlyfans.com') || 
     message.mediaUrl.includes('cdn.onlyfns.com') || 
     message.mediaUrl.includes('onfons.com'));
     
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
      <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-2" />
      <p className="text-sm text-center text-gray-600 dark:text-gray-300">
        Ошибка при загрузке медиа
      </p>
      {message.mediaUrl && isOnlyFans && (
        <div className="mt-2">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
            Возможно, требуется авторизация или прямой доступ
          </p>
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Открыть напрямую
            <ArrowDownTrayIcon className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
}

const MessageItem = ({ message, isMarkdown = false }: MessageProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMediaAccessibleState, setMediaAccessible] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [media, setMedia] = useState<MediaItem | null>(message.media?.[0] || null);
  const [currentAltIndex, setCurrentAltIndex] = useState(0);
  const [error, setError] = useState<MediaError | null>(null);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Отладочное логирование
  console.log(`Rendering MessageItem, has media: ${Boolean(message.media?.length)}`);
  if (message.media && message.media.length > 0) {
    // Ограничиваем подробное логирование только первым элементом
    if (message.media[0]) {
      console.log('First media type:', message.media[0].type);
      console.log('First media canView:', message.media[0].canView);
    }
  }

  // Получаем наилучший доступный URL медиа-файла
  const getMediaUrl = (media: MediaItem) => {
    // Если явно указано, что медиа недоступно или есть ошибка
    if (media.canView === false || media.hasError === true) return null;
    
    // Если медиа не готово, возвращаем null
    if (media.isReady === false) return null;
    
    // Предпочтение источникам видео для лучшего качества
    if (media.type === 'video' && media.videoSources && media.videoSources['720']) {
      const videoUrl = media.videoSources['720'];
      // Если это OnlyFans URL, проксируем его
      if (videoUrl && (
          videoUrl.includes('onlyfans.com') || 
          videoUrl.includes('cdn.onlyfns.com') || 
          videoUrl.includes('onfons.com')
        )) {
        return proxyImageUrl(videoUrl);
      }
      return normalizeUrl(videoUrl);
    }
    
    // Получаем URL и очищаем от экранированных слешей, если они есть
    let url = media.url || 
           media.files?.full?.url || 
           media.files?.preview?.url || 
           media.files?.squarePreview?.url || 
           media.files?.thumb?.url || 
           '';
              
    // Дополнительная защита от невалидных URL (убираем экранированные слеши)
    if (url && typeof url === 'string' && url.includes('\\/')) {
      url = url.replace(/\\\//g, '/');
    }
    
    // Проверка на валидность URL
    if (url && !url.startsWith('http')) {
      console.error('Invalid media URL:', url);
      return null;
    }
    
    // Проверяем, является ли URL от OnlyFans
    if (url && (
        url.includes('onlyfans.com') || 
        url.includes('cdn.onlyfns.com') || 
        url.includes('onfons.com')
      )) {
      return proxyImageUrl(url);
    }
    
    // Возвращаем прямой URL
    return url ? normalizeUrl(url) : null;
  };

  // Проверяем, является ли медиа доступным
  const checkMediaAccessible = (media: MediaItem) => {
    // Проверяем все флаги, которые могут указывать на недоступность медиа
    return media.canView !== false && 
           media.hasError !== true && 
           media.isReady !== false;
  };

  useEffect(() => {
    // Если сообщение содержит медиа, но оно не инициализировано
    if (message.mediaCount && !message.media && message.mediaUrl) {
      // Создаем временный объект MediaItem
      const tempMedia: MediaItem = {
        id: `temp-${message.id}`,
        type: message.mediaType as 'photo' | 'video' | 'file',
        url: message.mediaUrl,
        canView: message.isOpened,
        originalUrl: message.originalMediaUrl || undefined,
        alternatives: message.alternativeMediaUrls || [],
        isReady: true,
        hasError: false
      };
      
      setMedia(tempMedia);
    } else if (message.media?.[0]) {
      setMedia(message.media[0]);
    }
  }, [message]);

  /**
   * Обработка ошибок медиа
   */
  const handleMediaError = (
    mediaUrl: string | null | undefined, 
    event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>, 
    mediaType: 'image' | 'video'
  ) => {
    console.error(`Ошибка загрузки ${mediaType}:`, mediaUrl, event);
    
    // Определяем, является ли URL от OnlyFans
    const isOnlyFans = mediaUrl && 
      (mediaUrl.includes('onlyfans.com') || 
       mediaUrl.includes('cdn.onlyfns.com') || 
       mediaUrl.includes('onfons.com'));
       
    // Проверяем ошибку CORS
    const nativeEvent = event.nativeEvent;
    const isCorsError = nativeEvent instanceof ErrorEvent && 
      (nativeEvent.message.includes('CORS') || nativeEvent.message.includes('cross-origin'));
      
    // Извлекаем IP из URL, если это OnlyFans
    const ipAddress = isOnlyFans && mediaUrl ? extractIpFromUrl(mediaUrl) : null;
    
    // Определяем тип ошибки
    let errorType = 'general';
    if (isCorsError) {
      errorType = 'cors';
    } else if (ipAddress) {
      errorType = 'ip_mismatch';
    }
    
    // Получаем ID элемента
    const target = event.currentTarget;
    const messageId = target.closest('[data-message-id]')?.getAttribute('data-message-id');
    if (!messageId) return;
    
    // Находим сообщение по ID
    const message = { id: messageId, mediaUrl };
    
    // Создаем контейнер для плейсхолдера если его нет
    const containerId = `media-container-${messageId}`;
    let container = document.getElementById(containerId);
    if (!container) {
      const mediaElement = target.closest('.media-item');
      if (!mediaElement) return;
      
      container = document.createElement('div');
      container.id = containerId;
      mediaElement.innerHTML = '';
      mediaElement.appendChild(container);
    }
    
    // Рендерим плейсхолдер
    const root = createRoot(container);
    root.render(showMediaPlaceholder(message as Message));
  };

  // Функция для получения стандартного плейсхолдера для разных типов медиа
  const getPlaceholderElement = (type: string) => {
    return showMediaPlaceholder(message);
  };

  // Функция для отображения медиа-элемента
  const renderMediaItem = (media: MediaItem, index: number) => {
    // Получаем URL медиа-файла
    const mediaUrl = getMediaUrl(media);
    
    // Дополнительное логирование для этого медиа
    console.log(`Rendering media ${index}, type: ${media.type}, ready: ${media.isReady}, error: ${media.hasError}, URL:`, mediaUrl);
    
    if (!media) {
      console.error(`Media item ${index} is undefined or null`);
      return null;
    }
    
    // Проверка наличия files объекта для фото
    if (media.type === 'photo' && !media.files) {
      console.warn(`Photo media item ${index} lacks files object`, media);
    }
    
    // Если media.files.full.url === null, но canView === true, это может быть ошибка в API
    if (media.type === 'photo' && media.files?.full?.url === null && media.canView === true) {
      console.warn(`Photo media item ${index} has null URL but canView is true`, media);
    }
    
    // Если медиа не готово, показываем индикатор загрузки
    if (media.isReady === false) {
      return (
        <div key={`${media.id}-${index}`} className="media-container">
          <div className="bg-gray-100 rounded p-4 text-center">
          <div className="flex flex-col items-center text-gray-500">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
              <span className="mt-2">Медиа загружается...</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Если у медиа ошибка, показываем сообщение об ошибке
    if (media.hasError === true) {
      return (
        <div key={`${media.id}-${index}`} className="media-container">
          <div className="bg-red-50 rounded p-4 text-center">
            <div className="flex flex-col items-center text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
              <span className="mt-2">Ошибка загрузки медиа</span>
        </div>
          </div>
        </div>
      );
    }
    
    return (
      <div key={`${media.id}-${index}`} className="media-container">
        {checkMediaAccessible(media) ? (
          <>
            {media.type === 'photo' ? (
              <div className="relative">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Media content"
                    className="rounded max-w-full cursor-pointer hover:opacity-90"
                    onClick={(e) => {
                      e.preventDefault();
                      if (mediaUrl) window.open(mediaUrl, '_blank');
                    }}
                    onError={(e) => handleMediaError(mediaUrl, e, 'image')}
                  />
                ) : (
                  // Отображаем заглушку, если URL недоступен
                  getPlaceholderElement('photo')
                )}
              </div>
            ) : media.type === 'video' ? (
              <div className="relative">
                {mediaUrl ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="rounded max-w-full"
                    poster={media.files?.preview?.url ? normalizeUrl(media.files.preview.url) : undefined}
                    onError={(e) => handleMediaError(mediaUrl, e, 'video')}
                  />
                ) : (
                  // Отображаем заглушку, если URL недоступен
                  getPlaceholderElement('video')
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded p-2 text-center">
                {getPlaceholderElement(media.type || 'unknown')}
              </div>
            )}
          </>
        ) : (
          // Недоступное медиа (canView === false)
          <div className="relative">
            {getThumbFileUrl(media) ? (
              <div className="relative">
                <img 
                  src={getThumbFileUrl(media) || ''}
                  alt="Locked media preview"
                  className="rounded max-w-full opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="text-white text-center p-4">
                    <div className="text-2xl mb-1">🔒</div>
                    <div className="text-sm">Медиа недоступно</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 flex items-center justify-center rounded">
                <div className="text-white text-center p-4">
                  <div className="text-2xl mb-1">🔒</div>
                  <div className="text-sm">Медиа недоступно</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Проверяем наличие медиа в сообщении
  const hasMedia = Boolean(message.media?.length) || (message.mediaType && message.mediaUrl);
  
  // Отладочное логирование
  console.log(`Rendering MessageItem, fromUser: ${message.isFromUser}, position: ${message.isFromUser ? 'right' : 'left'}`);

  return (
    <div
      className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start gap-2 max-w-[80%] ${message.isFromUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Аватар показываем только для сообщений собеседника */}
        {!message.isFromUser && (
          <Avatar className="mt-0.5 flex-shrink-0">
            <AvatarImage src={message.fromUser.avatar || ''} />
            <AvatarFallback>
              {message.fromUser.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`rounded-lg px-4 py-2 ${
            message.isFromUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          {/* Имя отправителя показываем только для сообщений собеседника */}
          {!message.isFromUser && (
            <div className="text-xs font-medium mb-1">
              {message.fromUser.name || message.fromUser.username}
            </div>
          )}

          <p className="break-words">{message.text}</p>

          {/* Отображение медиа-файлов из массива media */}
          {message.media && message.media.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.isFree ? (
                // Бесплатный контент
                <>
                  {message.media.map((mediaItem, idx) => {
                    console.log(`Mapping media item ${idx}:`, mediaItem);
                    return renderMediaItem(mediaItem, idx);
                  })}
                </>
              ) : (
                // Платный контент
                <div className="relative rounded overflow-hidden">
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <div className="text-white text-center p-4">
                      <div className="text-3xl mb-2">🔒</div>
                      <div className="text-sm mb-1">Платный контент</div>
                      <div className="text-lg font-bold">${message.price}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {message.media.length} {message.media.length === 1 ? 'файл' : 'файлов'}
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-60"></div>
                  
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    {message.media.slice(0, 3).map((media, index) => {
                      const thumbUrl = getThumbFileUrl(media);
                      return (
                        <div 
                          key={`thumb-${media.id}-${index}`} 
                          className="w-12 h-12 bg-black rounded overflow-hidden border border-white/20"
                        >
                          {thumbUrl ? (
                            <img 
                              src={thumbUrl}
                              alt=""
                              className="w-full h-full object-cover opacity-50"
                            />
                          ) : media.type === 'photo' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-white text-xl">📷</span>
                            </div>
                          ) : media.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-white text-xl">🎥</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-white text-xl">📁</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {message.media.length > 3 && (
                      <div className="text-white text-sm">
                        +{message.media.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Проверка на наличие медиа в старом формате (для совместимости) */}
          {!message.media?.length && message.mediaType && (
            <div className="mt-2">
              {message.isFree ? (
                // Бесплатный контент
                <div>
                  {message.mediaType === 'photo' ? (
                    message.mediaUrl ? (
                      <Image
                        src={message.mediaUrl || ''}
                        alt="Изображение"
                        width={400}
                        height={300}
                        style={{ objectFit: 'contain' }}
                        className="rounded max-w-full cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (message.mediaUrl) window.open(message.mediaUrl, '_blank');
                        }}
                        onError={(e) => handleMediaError(message.mediaUrl, e, 'image')}
                      />
                    ) : (
                      // Отображаем заглушку, если URL недоступен
                      getPlaceholderElement('photo')
                    )
                  ) : message.mediaType === 'video' ? (
                    message.mediaUrl ? (
                      <video
                        src={message.mediaUrl || ''}
                        controls
                        className="rounded max-w-full"
                        onError={(e) => handleMediaError(message.mediaUrl, e, 'video')}
                      />
                    ) : (
                      // Отображаем заглушку, если URL недоступен
                      getPlaceholderElement('video')
                    )
                  ) : (
                    // Если тип медиа не определен
                    getPlaceholderElement('unknown')
                  )}
                </div>
              ) : (
                // Платный контент
                <div className="relative rounded overflow-hidden">
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <div className="text-white text-center p-4">
                      <div className="text-3xl mb-2">🔒</div>
                      <div className="text-sm mb-1">Платный контент</div>
                      <div className="text-lg font-bold">${message.price}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Если mediaCount > 0, но ни media ни mediaType не указаны - добавим заглушку */}
          {!(message.media?.length) && !message.mediaType && (message as any).mediaCount > 0 && (
            <div className="mt-2">
              {message.isFree ? (
                // Бесплатный контент с неизвестным типом
                getPlaceholderElement('unknown')
              ) : (
                // Платный контент с неизвестным типом
                <div className="relative rounded overflow-hidden">
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <div className="text-white text-center p-4">
                      <div className="text-3xl mb-2">🔒</div>
                      <div className="text-sm mb-1">Платный контент</div>
                      <div className="text-lg font-bold">${message.price}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {(message as any).mediaCount} {(message as any).mediaCount === 1 ? 'файл' : 'файлов'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs mt-1 text-right opacity-70">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
} 

export default MessageItem; 