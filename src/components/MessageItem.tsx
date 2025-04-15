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
    }>;
  };
}

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

  return (
    <div
      className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start gap-2 max-w-[80%] ${message.isFromUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
          {!message.isFromUser && (
            <div className="text-xs font-medium mb-1">
              {message.fromUser.name || message.fromUser.username}
            </div>
          )}

          <p className="break-words">{message.text}</p>

          {/* Проверка на наличие медиа в новом формате */}
          {message.media && message.media.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.isFree ? (
                // Бесплатный контент
                <>
                  {message.media.map((media) => (
                    <div key={media.id} className="media-container">
                      {media.type === 'photo' && media.url ? (
                        <img
                          src={media.url}
                          alt="Media content"
                          className="rounded max-w-full cursor-pointer hover:opacity-90"
                          onClick={() => window.open(media.url, '_blank')}
                          onError={(e) => {
                            console.error('Image failed to load:', media.url);
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMGMwLTUuNTIzLTQuNDc3LTEwLTEwLTEwLTUuNTIzIDAtMTAgNC40NzctMTAgMTBzNC40NzcgMTAgMTAgMTBjNS41MjMgMCAxMC00LjQ3NyAxMC0xMHptLTIyIDFjMC01LjUxNCA0LjQ4Ni0xMCAxMC0xMCA1LjUxNCAwIDEwIDQuNDg2IDEwIDEwIDAgNS41MTQtNC40ODYgMTAtMTAgMTAtNS41MTQgMC0xMC00LjQ4Ni0xMC0xMHptMTQuNS0zLjVjMC0uODI4LS42NzItMS41LTEuNS0xLjVzLTEuNS42NzItMS41IDEuNS42NzIgMS41IDEuNSAxLjUgMS41LS42NzIgMS41LTEuNXptLTkgMGMwLS44MjgtLjY3Mi0xLjUtMS41LTEuNXMtMS41LjY3Mi0xLjUgMS41LjY3MiAxLjUgMS41IDEuNSAxLjUtLjY3MiAxLjUtMS41em03LjUgM2MwIDQuMTQyLTIuNSA3LTcgN3MtNy0yLjg1OC03LTdjNS45NzYgNS45NzYgNy4xNzUgNSAxNCAweiIvPjwvc3ZnPg==';
                          }}
                        />
                      ) : media.type === 'video' && media.url ? (
                        <video
                          src={media.url}
                          controls
                          className="rounded max-w-full"
                          onError={(e) => {
                            console.error('Video failed to load:', media.url);
                            e.currentTarget.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMGMwLTUuNTIzLTQuNDc3LTEwLTEwLTEwLTUuNTIzIDAtMTAgNC40NzctMTAgMTBzNC40NzcgMTAgMTAgMTBjNS41MjMgMCAxMC00LjQ3NyAxMC0xMHptLTIyIDFjMC01LjUxNCA0LjQ4Ni0xMCAxMC0xMCA1LjUxNCAwIDEwIDQuNDg2IDEwIDEwIDAgNS41MTQtNC40ODYgMTAtMTAgMTAtNS41MTQgMC0xMC00LjQ4Ni0xMC0xMHptMTQuNS0zLjVjMC0uODI4LS42NzItMS41LTEuNS0xLjVzLTEuNS42NzItMS41IDEuNS42NzIgMS41IDEuNSAxLjUgMS41LS42NzIgMS41LTEuNXptLTkgMGMwLS44MjgtLjY3Mi0xLjUtMS41LTEuNXMtMS41LjY3Mi0xLjUgMS41LjY3MiAxLjUgMS41IDEuNSAxLjUtLjY3MiAxLjUtMS41em03LjUgM2MwIDQuMTQyLTIuNSA3LTcgN3MtNy0yLjg1OC03LTdjNS45NzYgNS45NzYgNy4xNzUgNSAxNCAweiIvPjwvc3ZnPg==';
                          }}
                        />
                      ) : (
                        <div className="bg-gray-100 rounded p-2 text-center">
                          Файл: {media.type || 'Неизвестный тип'}
                        </div>
                      )}
                    </div>
                  ))}
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
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {message.media.slice(0, 3).map((media, index) => (
                        <div 
                          key={`thumb-${media.id}-${index}`} 
                          className="w-12 h-12 bg-black rounded overflow-hidden border border-white/20"
                        >
                          {media.type === 'photo' && media.url && (
                            <img
                              src={media.url}
                              alt=""
                              className="w-full h-full object-cover opacity-50"
                            />
                          )}
                          {media.type === 'video' && (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <span className="text-white text-xl">🎥</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {message.media.length > 3 && (
                        <div className="text-white text-sm">
                          +{message.media.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Проверка на наличие медиа в старом формате (для совместимости) */}
          {!message.media && message.mediaType && message.mediaUrl && (
            <div className="mt-2">
              {message.isFree ? (
                // Бесплатный контент
                <div>
                  {message.mediaType === 'photo' ? (
                    <img
                      src={message.mediaUrl}
                      alt="Media content"
                      className="rounded max-w-full cursor-pointer hover:opacity-90"
                      onClick={() => window.open(message.mediaUrl, '_blank')}
                      onError={(e) => {
                        console.error('Image failed to load:', message.mediaUrl);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMGMwLTUuNTIzLTQuNDc3LTEwLTEwLTEwLTUuNTIzIDAtMTAgNC40NzctMTAgMTBzNC40NzcgMTAgMTAgMTBjNS41MjMgMCAxMC00LjQ3NyAxMC0xMHptLTIyIDFjMC01LjUxNCA0LjQ4Ni0xMCAxMC0xMCA1LjUxNCAwIDEwIDQuNDg2IDEwIDEwIDAgNS41MTQtNC40ODYgMTAtMTAgMTAtNS41MTQgMC0xMC00LjQ4Ni0xMC0xMHptMTQuNS0zLjVjMC0uODI4LS42NzItMS41LTEuNS0xLjVzLTEuNS42NzItMS41IDEuNS42NzIgMS41IDEuNSAxLjUgMS41LS42NzIgMS41LTEuNXptLTkgMGMwLS44MjgtLjY3Mi0xLjUtMS41LTEuNXMtMS41LjY3Mi0xLjUgMS41LjY3MiAxLjUgMS41IDEuNSAxLjUtLjY3MiAxLjUtMS41em03LjUgM2MwIDQuMTQyLTIuNSA3LTcgN3MtNy0yLjg1OC03LTdjNS45NzYgNS45NzYgNy4xNzUgNSAxNCAweiIvPjwvc3ZnPg==';
                      }}
                    />
                  ) : message.mediaType === 'video' ? (
                    <video
                      src={message.mediaUrl}
                      controls
                      className="rounded max-w-full"
                      onError={(e) => {
                        console.error('Video failed to load:', message.mediaUrl);
                        e.currentTarget.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMGMwLTUuNTIzLTQuNDc3LTEwLTEwLTEwLTUuNTIzIDAtMTAgNC40NzctMTAgMTBzNC40NzcgMTAgMTAgMTBjNS41MjMgMCAxMC00LjQ3NyAxMC0xMHptLTIyIDFjMC01LjUxNCA0LjQ4Ni0xMCAxMC0xMCA1LjUxNCAwIDEwIDQuNDg2IDEwIDEwIDAgNS41MTQtNC40ODYgMTAtMTAgMTAtNS41MTQgMC0xMC00LjQ4Ni0xMC0xMHptMTQuNS0zLjVjMC0uODI4LS42NzItMS41LTEuNS0xLjVzLTEuNS42NzItMS41IDEuNS42NzIgMS41IDEuNSAxLjUgMS41LS42NzIgMS41LTEuNXptLTkgMGMwLS44MjgtLjY3Mi0xLjUtMS41LTEuNXMtMS41LjY3Mi0xLjUgMS41LjY3MiAxLjUgMS41IDEuNSAxLjUtLjY3MiAxLjUtMS41em03LjUgM2MwIDQuMTQyLTIuNSA3LTcgN3MtNy0yLjg1OC03LTdjNS45NzYgNS45NzYgNy4xNzUgNSAxNCAweiIvPjwvc3ZnPg==';
                      }}
                    />
                  ) : null}
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

          <div className={`text-xs mt-1 ${message.isFromUser ? 'text-right text-white opacity-80' : 'text-right text-gray-600'}`}>
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
} 