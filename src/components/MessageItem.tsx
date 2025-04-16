import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import classNames from 'classnames';
import Image from 'next/image';

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
  
  try {
    // Кодируем URL для передачи в query-параметре
    const encodedUrl = encodeURIComponent(url);
    return `/api/proxy-image?url=${encodedUrl}`;
  } catch (e) {
    console.error('Error proxying URL:', e);
    return '';
  }
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
  
  // Для изображений используем прокси (исправлено - используем full вместо source)
  if (media.type === 'photo' && media.files?.full?.url) {
    return proxyImageUrl(media.files.full.url);
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
  
  // Проксируем URL через наш сервер
  return url ? proxyImageUrl(url) : '';
}

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
    
    // Предпочтение источникам видео для лучшего качества
    if (media.type === 'video' && media.videoSources && media.videoSources['720']) {
      return media.videoSources['720'];
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
      return '';
    }
    
    // Проксируем URL через наш сервер
    return url ? proxyImageUrl(url) : '';
  };

  // Проверяем, является ли медиа доступным
  const isMediaAccessible = (media: MediaItem) => {
    // Проверяем все флаги, которые могут указывать на недоступность медиа
    return media.canView !== false && 
           media.hasError !== true && 
           media.isReady !== false;
  };

  // Получаем заглушку для медиа
  const getPlaceholderElement = (mediaType: string) => {
    if (mediaType === 'photo') {
      return (
        <div className="bg-gray-200 rounded-lg w-full aspect-square flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="mt-2">Изображение</span>
          </div>
        </div>
      );
    } else if (mediaType === 'video') {
      return (
        <div className="bg-gray-200 rounded-lg w-full aspect-video flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.413-1.667-.13-1.667-.986V5.653z" />
            </svg>
            <span className="mt-2">Видео</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-200 rounded-lg w-full aspect-square flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="mt-2">Файл</span>
          </div>
        </div>
      );
    }
  };

  // Обработка ошибок прокси-сервера
  const handleProxyError = async (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>, 
    mediaUrl: string | null, 
    alternatives: string[] = [], 
    originalUrl: string | null = null, 
    showPlaceholder: () => void
  ) => {
    console.error('Media failed to load:', mediaUrl);
    
    // Сохраняем ссылку на элемент изображения сразу в начале функции
    const target = e.currentTarget;
    if (!target || !mediaUrl) {
      console.error('Invalid target element or media URL');
      return;
    }
    
    // Блокируем повторные вызовы для одного и того же элемента
    if (target.dataset.errorProcessed === 'true') {
      return;
    }
    target.dataset.errorProcessed = 'true';
    
    // Устанавливаем низкую прозрачность на время обработки ошибки
    target.style.opacity = '0.2';
    
    // Преобразуем mediaUrl в оригинальный URL (убираем /api/proxy-image?url=...)
    const extractOriginalUrl = (proxyUrl: string): string | null => {
      try {
        const url = new URL(proxyUrl);
        if (url.pathname === '/api/proxy-image') {
          return decodeURIComponent(url.searchParams.get('url') || '');
        }
        return proxyUrl;
      } catch {
        return null;
      }
    };
    
    // Оригинальный URL до проксирования (заменим на параметр)
    const extractedOriginalUrl = originalUrl || extractOriginalUrl(mediaUrl);
    console.log('Original URL:', extractedOriginalUrl);
    
    // Пробуем получить информацию об ошибке от прокси-сервера
    let fallbackUrlFromProxy: string | null = null;
    
    try {
      // Проверяем, вернул ли прокси-сервер JSON с информацией об ошибке
      const response = await fetch(mediaUrl);
      
      // Если прокси вернул JSON, значит это объяснение ошибки
      if (response.headers.get('content-type')?.includes('application/json')) {
        const errorData = await response.json();
        console.log('Proxy error details:', errorData);
        
        // Если есть fallbackUrl в ответе, используем его
        if (errorData.fallbackUrl) {
          fallbackUrlFromProxy = errorData.fallbackUrl;
          console.log('Found fallbackUrl in proxy response:', fallbackUrlFromProxy);
        }
      }
    } catch (err) {
      // Игнорируем ошибки при проверке ответа прокси
      console.log('Error checking proxy response:', err);
    }
    
    // Если прокси предложил fallbackUrl, пробуем его использовать
    if (fallbackUrlFromProxy) {
      // Используем напрямую ответ от прокси, минуя проксирование еще раз
      const proxyFallbackUrl = proxyImageUrl(fallbackUrlFromProxy);
      console.log('Using proxy fallback URL:', proxyFallbackUrl);
      
      try {
        // Создаем новый элемент img для предварительной загрузки
        const newImg = new Image();
        
        // Настраиваем обработчики событий
        newImg.onload = () => {
          console.log('Fallback URL loaded successfully');
          if (target.parentElement) {
            target.src = proxyFallbackUrl;
            target.style.opacity = '1';
            // Сбрасываем флаг обработки ошибки, чтобы можно было повторно обработать в случае ошибки
            delete target.dataset.errorProcessed;
          }
        };
        
        newImg.onerror = () => {
          console.log('Fallback URL also failed, trying direct URL approach');
          
          // Если fallback тоже не работает, пробуем добавить параметры для обхода кеша
          const cacheBusterUrl = `${proxyFallbackUrl}&t=${Date.now()}&retry=true`;
          const finalAttemptImg = new Image();
          
          finalAttemptImg.onload = () => {
            console.log('Cache busted fallback URL loaded successfully');
            if (target.parentElement) {
              target.src = cacheBusterUrl;
              target.style.opacity = '1';
            }
          };
          
          finalAttemptImg.onerror = () => {
            console.log('All fallback attempts failed, showing placeholder');
            tryFindAlternativeUrl(alternatives, extractedOriginalUrl, showPlaceholder);
          };
          
          finalAttemptImg.src = cacheBusterUrl;
        };
        
        // Начинаем загрузку изображения
        newImg.src = proxyFallbackUrl;
        return;
      } catch (e) {
        console.error('Error trying fallback URL from proxy:', e);
      }
    }
    
    // Функция для поиска альтернативного URL
    const tryFindAlternativeUrl = (alternatives: string[], originalUrl: string | null, showPlaceholder: () => void) => {
      // Пытаемся найти медиа-элемент, соответствующий URL
      const media = message.media?.find(m => {
        const url = m.url || m.files?.full?.url || '';
        // Проверяем соответствие оригинальному URL или текущему mediaUrl
        return (originalUrl && url && originalUrl.includes(url)) || 
               (mediaUrl && mediaUrl.includes(encodeURIComponent(url)));
      });
      
      if (!media) {
        // Если не нашли соответствующий медиа-элемент, показываем заглушку
        showPlaceholder();
        return;
      }
      
      // Пытаемся использовать альтернативные ссылки в порядке приоритета
      const alternativeUrls = [
        media.files?.preview?.url,
        media.files?.squarePreview?.url,
        media.files?.thumb?.url
      ].filter(Boolean) as string[];
      
      // Пробуем каждый URL в очереди
      tryNextUrl(alternativeUrls, 0, showPlaceholder);
    };
    
    // Функция для последовательной проверки альтернативных URL
    const tryNextUrl = (urls: string[], index: number, showPlaceholder: () => void) => {
      if (index >= urls.length) {
        // Если все URL проверены и не работают, показываем заглушку
        showPlaceholder();
        return;
      }
      
      const currentUrl = urls[index];
      console.log(`Trying alternative URL (${index + 1}/${urls.length}):`, currentUrl);
      
      // Проверяем, существует ли еще элемент в DOM
      if (!target.parentElement) {
        console.log('Target element removed from DOM');
        return;
      }
      
      try {
        // Создаем новый элемент для проверки URL
        const testImg = new Image();
        
        // Обработчик успешной загрузки
        testImg.onload = () => {
          console.log('Alternative URL loaded successfully:', currentUrl);
          if (target.parentElement) {
            target.src = proxyImageUrl(currentUrl);
            target.style.opacity = '1';
          }
        };
        
        // Обработчик ошибки - переходим к следующему URL
        testImg.onerror = () => {
          console.log('Alternative URL failed:', currentUrl);
          // Пробуем следующий URL
          tryNextUrl(urls, index + 1, showPlaceholder);
        };
        
        // Загружаем изображение через прокси
        testImg.src = proxyImageUrl(currentUrl);
      } catch (err) {
        console.error('Error checking alternative URL:', err);
        // При ошибке переходим к следующему URL
        tryNextUrl(urls, index + 1, showPlaceholder);
      }
    };
    
    // Если нет fallbackUrl от прокси, пробуем найти альтернативные URL
    if (!fallbackUrlFromProxy) {
      tryFindAlternativeUrl(alternatives, extractedOriginalUrl, showPlaceholder);
    }
  };
  
  // Функция для отображения заглушки вместо видео
  const showVideoPlaceholder = (videoElement: HTMLVideoElement) => {
    // Проверяем, существует ли элемент в DOM
    if (!videoElement.parentElement) {
      console.log('Video element removed from DOM, cannot show placeholder');
      return;
    }
    
    // Предотвращаем повторную вставку плейсхолдера
    if (videoElement.nextElementSibling?.classList.contains('video-placeholder')) {
      console.log('Video placeholder already shown');
      return;
    }
    
    videoElement.style.display = 'none';
    
    // Создаем элемент заглушки
    const placeholder = document.createElement('div');
    placeholder.className = 'bg-gray-200 rounded-lg w-full aspect-video flex items-center justify-center video-placeholder';
    placeholder.innerHTML = `
      <div class="flex flex-col items-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.413-1.667-.13-1.667-.986V5.653z" />
        </svg>
        <span class="mt-2">Видео недоступно</span>
      </div>
    `;
    
    // Добавляем элемент в DOM после видео
    videoElement.parentElement.appendChild(placeholder);
  };
  
  // Функция для отображения заглушки вместо изображения
  const showImagePlaceholder = (imgElement: HTMLImageElement) => {
    // Проверяем, существует ли элемент в DOM
    if (!imgElement.parentElement) {
      console.log('Image element removed from DOM, cannot show placeholder');
      return;
    }
    
    // Предотвращаем повторную вставку плейсхолдера
    if (imgElement.nextElementSibling?.classList.contains('image-placeholder')) {
      console.log('Placeholder already shown');
      return;
    }
    
    imgElement.style.display = 'none';
    
    // Создаем элемент заглушки
    const placeholder = document.createElement('div');
    placeholder.className = 'bg-gray-200 rounded-lg w-full aspect-square flex items-center justify-center image-placeholder';
    placeholder.innerHTML = `
      <div class="flex flex-col items-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <span class="mt-2">Изображение недоступно</span>
      </div>
    `;
    
    // Добавляем элемент в DOM после изображения
    imgElement.parentElement.appendChild(placeholder);
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
        {isMediaAccessible(media) ? (
          <>
            {media.type === 'photo' ? (
              <div className="relative">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Media content"
                    className="rounded max-w-full cursor-pointer hover:opacity-90"
                    onClick={() => {
                      if (mediaUrl) window.open(mediaUrl, '_blank');
                    }}
                    onError={(e) => handleProxyError(
                      e,
                      mediaUrl,
                      media.alternatives || [],
                      media.originalUrl,
                      () => showImagePlaceholder(e.currentTarget)
                    )}
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
                    poster={media.files?.preview?.url ? proxyImageUrl(media.files.preview.url) : undefined}
                    onError={(e) => {
                      console.error('Video failed to load:', mediaUrl);
                      const videoElement = e.currentTarget;
                      handleProxyError(
                        e as React.SyntheticEvent<HTMLVideoElement, Event>,
                        mediaUrl,
                        media.alternatives || [],
                        media.originalUrl,
                        () => showVideoPlaceholder(videoElement)
                      );
                    }}
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
          <div className="relative rounded overflow-hidden">
            {getThumbFileUrl(media) ? (
              <div className="relative">
                <img 
                  src={getThumbFileUrl(media)} 
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
                      <img
                        src={message.mediaUrl}
                        alt="Media content"
                        className="rounded max-w-full cursor-pointer hover:opacity-90"
                        onClick={() => {
                          if (message.mediaUrl) window.open(message.mediaUrl, '_blank');
                        }}
                        onError={(e) => handleProxyError(
                          e,
                          message.mediaUrl,
                          message.alternativeMediaUrls || [],
                          message.originalMediaUrl,
                          () => showImagePlaceholder(e.currentTarget)
                        )}
                      />
                    ) : (
                      // Отображаем заглушку, если URL недоступен
                      getPlaceholderElement('photo')
                    )
                  ) : message.mediaType === 'video' ? (
                    message.mediaUrl ? (
                      <video
                        src={message.mediaUrl}
                        controls
                        className="rounded max-w-full"
                        onError={(e) => {
                          console.error('Video failed to load:', message.mediaUrl);
                          const videoElement = e.currentTarget;
                          handleProxyError(
                            e as React.SyntheticEvent<HTMLVideoElement, Event>,
                            message.mediaUrl,
                            message.alternativeMediaUrls || [],
                            message.originalMediaUrl,
                            () => showVideoPlaceholder(videoElement)
                          );
                        }}
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