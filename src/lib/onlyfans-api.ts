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
    url?: string;
    files?: {
      full?: {
        url: string;
      };
    };
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
    username?: string;
    nickname?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    [key: string]: any; // Для захвата всех других полей
  };
  lastMessage?: {
    text: string;
    mediaCount: number;
    price: number;
    isFree: boolean;
  };
  unreadMessagesCount: number;
  [key: string]: any; // Для захвата всех других полей
}

export interface MessagePaginationResponse {
  messages: Message[];
  pagination: {
    next_id: string | null;
    total: number;
    hasMore: boolean;
  } | null;
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

// Усовершенствованная функция получения имени пользователя
function getUserDisplayName(fan: ChatResponse['fan']): string {
  // Хардкодированные исправления для известных проблемных ID пользователей
  const hardcodedNames: Record<number, string> = {
    // Добавьте здесь ID пользователей и их правильные имена
    // Например:
    // 123456: "Correct User Name",
  };
  
  // Проверяем, есть ли хардкодированное имя для этого ID
  if (fan.id in hardcodedNames) {
    console.log(`Using hardcoded name for user ${fan.id}: ${hardcodedNames[fan.id]}`);
    return hardcodedNames[fan.id];
  }
  
  // Логируем все возможные поля, содержащие имя пользователя
  console.log('All name fields for user', fan.id, {
    name: fan.name,
    _view: fan._view,
    username: fan.username,
    nickname: fan.nickname,
    displayName: fan.displayName,
    firstName: fan.firstName,
    lastName: fan.lastName,
    fullName: fan.fullName,
    allKeys: Object.keys(fan).filter(key => 
      typeof fan[key] === 'string' && 
      key.toLowerCase().includes('name')
    )
  });
  
  // Проверяем все возможные поля имени в порядке приоритета
  if (fan.name && fan.name.length > 1) return fan.name;
  if (fan.displayName && fan.displayName.length > 1) return fan.displayName;
  if (fan.fullName && fan.fullName.length > 1) return fan.fullName;
  if (fan.nickname && fan.nickname.length > 1) return fan.nickname;
  if (fan.username && fan.username.length > 1) return fan.username;
  if (fan._view && fan._view.length > 1) return fan._view;
  
  // Если все имена короткие, используем самое длинное
  const nameFields = [
    fan.name, fan.displayName, fan.fullName, fan.nickname, 
    fan.username, fan._view, fan.firstName, fan.lastName
  ].filter(Boolean) as string[];
  
  if (nameFields.length > 0) {
    // Сортируем по длине и выбираем самое длинное
    const longestName = nameFields.sort((a, b) => b.length - a.length)[0];
    return longestName;
  }
  
  return 'Unknown User';
}

export async function getChats(): Promise<Chat[]> {
  const response = await fetch('/api/onlyfans/chats');
  const result = await handleApiResponse<ApiResponse<ChatResponse[]>>(response);
  
  console.log('Raw API Response:', result);
  console.log('Full API structure:', JSON.stringify(result, null, 2));
  
  // Проверяем структуру ответа
  if (!result.data || !Array.isArray(result.data)) {
    console.error('Invalid response structure:', result);
    throw new Error('Invalid response format from chats API');
  }
  
  // Логируем данные пользователей, чтобы найти проблему
  console.log('DETAILED USER DATA LOG:');
  result.data.forEach((chat, index) => {
    console.log(`User ${index + 1}:`, {
      id: chat.fan.id,
      name: chat.fan.name,
      nameLength: chat.fan.name ? chat.fan.name.length : 0,
      nameType: chat.fan.name ? typeof chat.fan.name : 'undefined',
      view: chat.fan._view,
      viewLength: chat.fan._view ? chat.fan._view.length : 0,
      viewType: chat.fan._view ? typeof chat.fan._view : 'undefined',
      rawFan: chat.fan
    });
  });
  
  return result.data.map((chat) => {
    // Используем усовершенствованную функцию получения имени пользователя
    const username = getUserDisplayName(chat.fan);
    
    // Логируем итоговое решение
    console.log(`User ${chat.fan.id} final username:`, username);
    
    return {
      id: chat.fan.id,
      username: username,
      lastMessage: chat.lastMessage?.text?.replace(/<[^>]*>/g, '') || undefined,
      unreadCount: chat.unreadMessagesCount,
      hasMedia: Boolean(chat.lastMessage?.mediaCount),
      price: chat.lastMessage?.price ?? 0,
      isFree: chat.lastMessage?.isFree ?? true
    };
  });
}

/**
 * Получает сообщения из чата
 * @param chatId ID чата
 * @param nextId ID сообщения для пагинации (необязательный)
 * @param limit Количество сообщений (по умолчанию 30)
 * @returns Массив сообщений и информация о пагинации
 */
export async function getChatMessages(
  chatId: string, 
  nextId?: string, 
  limit: number = 30
): Promise<MessagePaginationResponse> {
  // Формируем query-параметры
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  
  // Добавляем nextId, если он указан
  if (nextId) {
    params.append('next_id', nextId);
  }
  
  try {
    const response = await fetch(`/api/onlyfans/chats/${chatId}/messages?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages. Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Отладочное логирование
    console.log('Raw messages response:', JSON.stringify(data).substring(0, 500) + '...');
    
    // Проверяем и трансформируем данные
    if (!data || !Array.isArray(data.messages)) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format');
    }
    
    // Проверяем и преобразуем сообщения
    const messages: Message[] = data.messages.map((msg: any) => {
      // Отладочное логирование для проверки структуры медиафайлов
      if (msg.media && msg.media.length > 0) {
        console.log(`Message ${msg.id} has media:`, JSON.stringify(msg.media).substring(0, 200));
      }
      
      // Проверяем, является ли сообщение от текущего пользователя
      // В API данные приходят так, что isFromUser указывает, что сообщение именно от пользователя
      const isFromCurrentUser = msg.isFromUser === true;
      
      console.log(`Message ${msg.id} isFromUser: ${isFromCurrentUser}, original value:`, msg.isFromUser);
      
      return {
        id: parseInt(msg.id) || Date.now(),
        text: msg.text || "",
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        fromUser: isFromCurrentUser, // Используем правильное значение
        media: Array.isArray(msg.media) ? msg.media.map((m: any) => {
          // Определяем корректный URL медиа-файла
          let url = '';
          if (m.files && m.files.full && m.files.full.url) {
            url = m.files.full.url;
          } else if (m.url) {
            url = m.url;
          }
          
          return {
            id: m.id || Date.now() + Math.random(),
            type: m.type || 'photo',
            url: url,
            files: m.files
          };
        }) : [],
        price: msg.price || 0,
        isFree: msg.isFree === undefined ? true : msg.isFree,
        isNew: msg.isNew || false
      };
    });
    
    // Получаем информацию о пагинации
    const pagination = data.pagination || {
      next_id: data.next_id || null,
      total: data.total || messages.length,
      hasMore: data.hasMore || !!data.next_id
    };
    
    // Логируем пример обработанного сообщения
    if (messages.length > 0) {
      console.log('First processed message:', JSON.stringify(messages[0]).substring(0, 300));
      if (messages[0].media && messages[0].media.length > 0) {
        console.log('Media in first message:', messages[0].media);
      }
    }
    
    return {
      messages,
      pagination
    };
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
}

export async function sendMessage(chatId: string, text: string, options?: { price?: number, isFree?: boolean }): Promise<Message> {
  try {
    const body: any = { text };
    
    // Добавляем опции цены и платности, если они предоставлены
    if (options) {
      if (options.price !== undefined) {
        body.price = options.price;
      }
      
      if (options.isFree !== undefined) {
        body.isFree = options.isFree;
      }
    }
    
    const response = await fetch(`/api/onlyfans/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    const data = await response.json();
    
    // Преобразуем ответ API в формат Message
    return {
      id: data.data.id,
      text: data.data.text,
      timestamp: data.data.createdAt,
      fromUser: true, // Сообщение от текущего пользователя
      media: data.data.media || [],
      isFree: data.data.isFree,
      price: data.data.price || 0,
      isNew: data.data.isNew
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to send message');
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