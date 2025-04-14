const API_KEY = 'ofapi_ZaD54r2pLOoxX3THd4PaRNClJHGMutwNsf107iNN508c18f9';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';
const API_BASE_URL = 'https://onlyfansapi.com/api/v1';

export interface Message {
  id: string;
  text: string;
  fromUser: boolean;
  timestamp: string;
}

export interface Chat {
  id: string;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface AccountInfo {
  id: string;
  username: string;
  email?: string;
  name?: string;
  _meta?: {
    _credits?: {
      used: number;
      balance: number;
    };
  };
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
  try {
    const response = await fetch('/api/onlyfans/chats', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    return handleApiResponse<Chat[]>(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch chats. Please check your connection.');
  }
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