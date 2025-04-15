const API_KEY = 'ofapi_ZaD54r2pLOoxX3THd4PaRNClJHGMutwNsf107iNN508c18f9';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';
const API_BASE_URL = 'https://onlyfansapi.com/api/v1';

export interface Message {
  id: number;
  text: string;
  fromUser: boolean;
  timestamp: string;
  isNew: boolean;
  isFree: boolean;
  price: number;
  media?: Array<{
    id: number;
    type: string;
    url: string;
  }>;
}

export interface Chat {
  id: number;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  hasMedia: boolean;
  price: number;
  isFree: boolean;
}

export interface AccountInfo {
  id: string;
  username: string;
  email?: string;
  name?: string;
  avatar?: string;
  _meta?: {
    _credits?: {
      used: number;
      balance: number;
    };
  };
}

export interface AuthResponse {
  attempt_id: string;
  message: string;
  polling_url: string;
}

export interface ModelAuth {
  email: string;
  password: string;
  proxyCountry: 'us' | 'uk' | 'de' | 'es' | 'ua';
}

interface ApiError {
  error: string;
  message: string;
  description?: string;
  _meta?: {
    _credits?: {
      used: number;
      balance: number;
    };
  };
}

interface ApiResponse<T> {
  data: T;
  _pagination: {
    next_page: string | null;
  };
  _meta: {
    _credits: {
      used: number;
      balance: number;
      note: string;
    };
    _cache: {
      is_cached: boolean;
      note: string;
    };
    _rate_limits: {
      limit_minute: number;
      limit_day: number;
      remaining_minute: number;
      remaining_day: number;
    };
  };
}

interface ChatResponse {
  fan: {
    id: number;
    name?: string;
    _view: string;
  };
  lastMessage?: {
    text: string;
    mediaCount: number;
    price: number;
    isFree: boolean;
  };
  unreadMessagesCount: number;
}

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  
  if (!response.ok) {
    const error = data as ApiError;
    if (error.error === 'ENDPOINT_INSUFFICIENT_CREDIT') {
      throw new Error('Недостаточно кредитов. Пожалуйста, пополните баланс.');
    }
    throw new Error(error.message || 'Unknown API error');
  }
  
  return data as T;
};

export async function checkAuth(): Promise<AccountInfo> {
  try {
    const response = await fetch('/api/onlyfans/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    return handleApiResponse<AccountInfo>(response);
  } catch (error) {
    console.error('Auth Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to authenticate. Please check your API credentials.');
  }
}

export async function getChats(): Promise<Chat[]> {
  const response = await fetch('/api/onlyfans/chats');
  const result = await handleApiResponse<ApiResponse<ChatResponse[]>>(response);
  
  console.log('Raw API Response:', result);
  
  // Проверяем структуру ответа
  if (!result.data || !Array.isArray(result.data)) {
    console.error('Invalid response structure:', result);
    throw new Error('Invalid response format from chats API');
  }
  
  return result.data.map((chat) => ({
    id: chat.fan.id,
    username: chat.fan.name || chat.fan._view || 'Unknown',
    lastMessage: chat.lastMessage?.text?.replace(/<[^>]*>/g, '') || undefined,
    unreadCount: chat.unreadMessagesCount,
    hasMedia: Boolean(chat.lastMessage?.mediaCount),
    price: chat.lastMessage?.price ?? 0,
    isFree: chat.lastMessage?.isFree ?? true
  }));
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  try {
    const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    return handleApiResponse<Message[]>(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch messages. Please check your connection.');
  }
}

export async function sendMessage(chatId: string, text: string): Promise<Message> {
  try {
    const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    return handleApiResponse<Message>(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to send message. Please check your connection.');
  }
}

export async function authenticateModel(auth: ModelAuth): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/onlyfans/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(auth)
    });
    return handleApiResponse<AuthResponse>(response);
  } catch (error) {
    console.error('Model Auth Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to authenticate model. Please check credentials.');
  }
}

export async function pollAuthStatus(attemptId: string): Promise<AccountInfo> {
  try {
    const response = await fetch(`/api/onlyfans/authenticate/${attemptId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    return handleApiResponse<AccountInfo>(response);
  } catch (error) {
    console.error('Auth Status Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to check authentication status.');
  }
} 