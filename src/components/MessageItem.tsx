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
  };
}

export default function MessageItem({ message }: MessageProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

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

          {message.mediaType && message.mediaUrl && (
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
                    />
                  ) : message.mediaType === 'video' ? (
                    <video
                      src={message.mediaUrl}
                      controls
                      className="rounded max-w-full"
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

          <div className="text-xs mt-1 text-right opacity-70">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
} 