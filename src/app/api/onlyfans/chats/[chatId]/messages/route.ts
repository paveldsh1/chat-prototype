import { NextResponse } from 'next/server';

// Константы для API
const API_KEY = 'ofapi_p0wHp23pKLWlqemuMm4gQ2kIuXzqdkp34MYn0E9B081dedfb';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    // Сохраняем chatId как строку и преобразуем в число только где необходимо
    const chatId = params.chatId;
    
    // Получаем параметры запроса
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '30';
    const lastMessageId = url.searchParams.get('id');
    
    // Формируем URL с учетом параметров пагинации
    let apiUrl = `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${chatId}/messages?limit=${limit}`;
    if (lastMessageId) {
      apiUrl += `&id=${lastMessageId}`;
    }
    
    console.log('Fetching messages from:', apiUrl);
    
    // Выполняем запрос к API OnlyFans
    const response = await fetch(
      apiUrl,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API returned ${response.status}: ${errorText}`);
      
      // Возвращаем пустой массив сообщений при ошибке API
      return NextResponse.json({
        messages: [],
        pagination: {
          next_id: null
        }
      }, { status: response.status });
    }

    const rawData = await response.json();
    console.log('Raw API response:', JSON.stringify(rawData).substring(0, 200) + '...');
    
    if (!rawData.data || !rawData.data.list) {
      console.error('Invalid response structure:', rawData);
      throw new Error('Invalid response format from API');
    }
    
    // Исправляем экранированные URL-адреса в ответе API
    const fixedRawData = fixEscapedUrls(rawData);
    
    // Преобразуем ответ API в формат, ожидаемый клиентом
    const messages = fixedRawData.data.list.map((msg: any) => {
      console.log('Processing message from API:', msg.id, 'Has media:', Boolean(msg.media?.length));
      
      // Если есть медиа, логируем для отладки
      if (msg.media && msg.media.length > 0) {
        console.log(`Message ${msg.id} media count: ${msg.media.length}`);
        console.log(`Media sample:`, JSON.stringify(msg.media[0]).substring(0, 300));
      }
      
      // Безопасно преобразуем chatId в число
      const chatIdNum = parseInt(chatId);
      
      return {
        id: msg.id,
        text: msg.text?.replace(/<[^>]*>/g, '') || '', // Удаляем HTML теги
        fromUser: {
          id: msg.fromUser?.id || '',
          name: msg.fromUser?.name || '',
          username: msg.fromUser?._view || '',
          avatar: null
        },
        mediaType: msg.media && msg.media.length > 0 ? msg.media[0].type : null,
        mediaUrl: msg.media && msg.media.length > 0 ? 
          (msg.media[0].files?.full?.url || msg.media[0].files?.preview?.url) : null,
        createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
        isFromUser: msg.fromUser?.id !== chatIdNum,
        price: msg.price || 0,
        isFree: msg.isFree !== false,
        isOpened: msg.isOpened !== false,
        // Важно! Добавляем массив media для корректной обработки в компоненте
        media: msg.media || [],
        // Добавляем mediaCount для отображения количества медиа
        mediaCount: msg.media?.length || 0,
        isMediaReady: msg.isMediaReady
      };
    });

    // Добавляем информацию о пагинации
    return NextResponse.json({
      messages,
      pagination: {
        next_id: fixedRawData._pagination?.next_page ? 
          new URL(fixedRawData._pagination.next_page).searchParams.get('id') : 
          null
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // Возвращаем пустой массив сообщений при ошибке
    return NextResponse.json({
      messages: [],
      pagination: {
        next_id: null
      }
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    console.log('POST запрос к API сообщений');
    // Сохраняем chatId как строку
    const chatId = params.chatId;
    
    // Обрабатываем только JSON-запросы для текстовых сообщений
    const jsonData = await request.json();
    const text = jsonData.text || '';
    
    // Отправляем сообщение через API OnlyFans
    const response = await fetch(
      `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${chatId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error sending message:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    // Возвращаем ответ от API
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Функция для исправления URL с экранированными слешами
function fixEscapedUrls(obj: any): any {
  if (!obj) return obj;
  
  if (typeof obj === 'string' && obj.includes('\\/')) {
    return obj.replace(/\\\//g, '/');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => fixEscapedUrls(item));
  }
  
  if (typeof obj === 'object') {
    const result = {...obj};
    for (const key in result) {
      result[key] = fixEscapedUrls(result[key]);
    }
    return result;
  }
  
  return obj;
} 