import { MediaItem } from '../components/MessageItem';

export interface Message {
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
  mediaCount?: number;
  isMediaReady?: boolean;
  alternativeMediaUrls?: string[];
  originalMediaUrl?: string | null;
  media?: Array<MediaItem>;
} 