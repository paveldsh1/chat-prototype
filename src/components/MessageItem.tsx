import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    media?: Array<{
      id: string | number;
      type: string;
      url?: string;
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
    }>;
  };
}

// Определяем тип для медиа-элементов
type MediaItem = {
  id: string | number;
  type: string;
  url?: string;
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
};

export default function MessageItem({ message }: MessageProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Отладочное логирование
  console.log(`Rendering MessageItem, has media: ${Boolean(message.media?.length)}`);
  if (message.media && message.media.length > 0) {
    console.log('Media items:', message.media);
  }

  // Получаем наилучший доступный URL медиа-файла
  const getMediaUrl = (media: MediaItem) => {
    if (media.canView === false) return null;
    
    // Предпочтение источникам видео для лучшего качества
    if (media.type === 'video' && media.videoSources && media.videoSources['720']) {
      return media.videoSources['720'];
    }
    
    // Для всех других типов файлов используем любой доступный URL
    return media.url || 
           media.files?.full?.url || 
           media.files?.preview?.url || 
           media.files?.squarePreview?.url || 
           media.files?.thumb?.url || 
           '';
  };

  // Получаем URL миниатюры
  const getThumbUrl = (media: MediaItem) => {
    return media.files?.thumb?.url || 
           media.files?.squarePreview?.url || 
           media.files?.preview?.url || 
           '';
  };

  // Проверяем, является ли медиа доступным
  const isMediaAccessible = (media: MediaItem) => {
    return media.canView !== false;
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

  // Функция для отображения медиа-элемента
  const renderMediaItem = (media: MediaItem, index: number) => {
    const mediaUrl = getMediaUrl(media);
    
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
                    onError={(e) => {
                      console.error('Image failed to load:', mediaUrl);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.appendChild(
                        document.createRange().createContextualFragment(
                          `<div class="bg-gray-200 rounded-lg w-full aspect-square flex items-center justify-center">
                            <div class="flex flex-col items-center text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" class="w-12 h-12">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                              <span class="mt-2">Изображение недоступно</span>
                            </div>
                          </div>`
                        )
                      );
                    }}
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
                    poster={media.files?.preview?.url || undefined}
                    onError={(e) => {
                      console.error('Video failed to load:', mediaUrl);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.appendChild(
                        document.createRange().createContextualFragment(
                          `<div class="bg-gray-200 rounded-lg w-full aspect-video flex items-center justify-center">
                            <div class="flex flex-col items-center text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" class="w-12 h-12">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.413-1.667-.13-1.667-.986V5.653z" />
                              </svg>
                              <span class="mt-2">Видео недоступно</span>
                            </div>
                          </div>`
                        )
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
            {getThumbUrl(media) ? (
              <div className="relative">
                <img 
                  src={getThumbUrl(media)} 
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
                  {message.media.map(renderMediaItem)}
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
                      const thumbUrl = getThumbUrl(media);
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
                        onError={(e) => {
                          console.error('Image failed to load:', message.mediaUrl);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.appendChild(
                            document.createRange().createContextualFragment(
                              `<div class="bg-gray-200 rounded-lg w-full aspect-square flex items-center justify-center">
                                <div class="flex flex-col items-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" class="w-12 h-12">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                  </svg>
                                  <span class="mt-2">Изображение недоступно</span>
                                </div>
                              </div>`
                            )
                          );
                        }}
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
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.appendChild(
                            document.createRange().createContextualFragment(
                              `<div class="bg-gray-200 rounded-lg w-full aspect-video flex items-center justify-center">
                                <div class="flex flex-col items-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" class="w-12 h-12">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.413-1.667-.13-1.667-.986V5.653z" />
                                  </svg>
                                  <span class="mt-2">Видео недоступно</span>
                                </div>
                              </div>`
                            )
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