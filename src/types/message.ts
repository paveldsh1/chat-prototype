// Интерфейс для медиа-элементов в сообщениях
export interface MessageMedia {
  id: string | number;
  type: string;
  url?: string;
  width?: number;
  height?: number;
  isReady?: boolean;
  hasError?: boolean;
  canView?: boolean;
  duration?: number;
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
  videoSources?: {
    "720"?: string | null;
    "240"?: string | null;
  };
  alternatives?: string[];
  originalUrl?: string | null;
  onClick?: () => void; // Обработчик клика для открытия медиа
}

// Интерфейс для информации о пользователе в сообщении
export interface MessageUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

// Интерфейс для сообщений
export interface MessageData {
  id: string;
  text: string;
  fromUser: MessageUser;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
  isFromUser: boolean;
  price: number;
  isFree: boolean;
  isOpened: boolean;
  mediaCount?: number;
  isMediaReady?: boolean;
  alternativeMediaUrls?: string[];
  originalMediaUrl?: string | null;
  media?: MessageMedia[];
}

// Интерфейс для пропсов MessageItem компонента
export interface MessageItemProps {
  message: MessageData;
  previousMessageDate?: string;
  showDateSeparator?: boolean;
} 