import { NextResponse } from 'next/server';

// Получаем API данные из переменных окружения
const API_KEY = process.env.ONLYFANS_API_KEY;
const ACCOUNT_ID = process.env.ONLYFANS_ACCOUNT_ID;
const API_BASE_URL = process.env.ONLYFANS_API_BASE_URL || 'https://app.onlyfansapi.com/api';

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

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = await params;
    
    // Получаем параметры запроса
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '30';
    const lastMessageId = url.searchParams.get('id');
    
    // Формируем URL с учетом параметров пагинации
    let apiUrl = `${API_BASE_URL}/${ACCOUNT_ID}/chats/${chatId}/messages?limit=${limit}`;
    if (lastMessageId) {
      apiUrl += `&id=${lastMessageId}`;
    }
    
    
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
    
    if (!rawData.data || !rawData.data.list) {
      console.error('Invalid response structure:', rawData);
      throw new Error('Invalid response format from API');
    }
    
    // Исправляем экранированные URL-адреса в ответе API
    const fixedRawData = fixEscapedUrls(rawData);
    
    // Преобразуем ответ API в формат, ожидаемый клиентом
    const messages = fixedRawData.data.list.map((msg: any) => {
      
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
    const { chatId } = await params;
    
    // Определяем тип контента запроса
    const contentType = request.headers.get('Content-Type') || '';
    
    // Обработка multipart/form-data (для медиа)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
      }
      
      console.log(`Загрузка файла: ${file.name}, размер: ${file.size}, тип: ${file.type}`);
      
      // Преобразуем File в ArrayBuffer для отправки
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      
      // Создаем FormData для отправки файла
      const uploadFormData = new FormData();
      const fileBlob = new Blob([fileBuffer], { type: file.type });
      uploadFormData.append('file', fileBlob, file.name);
      
      // Загружаем файл на OnlyFans
      const uploadResponse = await fetch(
        `${API_BASE_URL}/${ACCOUNT_ID}/chats/${chatId}/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          },
          body: uploadFormData
        }
      );
      
      if (!uploadResponse.ok) {
        console.error(`Ошибка загрузки: ${uploadResponse.status}`);
        const errorData = await uploadResponse.json();
        return NextResponse.json(
          { error: 'Ошибка загрузки файла', details: errorData },
          { status: uploadResponse.status }
        );
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Ответ API загрузки:', uploadData);
      
      if (!uploadData.data || !uploadData.data.id) {
        console.error('Неверный формат ответа API загрузки:', uploadData);
        return NextResponse.json(
          { error: 'Неверный формат ответа API загрузки' },
          { status: 500 }
        );
      }
      
      // Получаем ID загруженного медиа
      const mediaId = uploadData.data.id;
      
      // Отправляем сообщение с медиа
      const messageData: any = {
        mediaFiles: mediaId,
        text: formData.get('text') || '',
      };
      
      // Добавляем цену, если она указана
      const price = formData.get('price');
      if (price) {
        const priceValue = parseFloat(price.toString());
        if (!isNaN(priceValue) && priceValue > 0) {
          messageData.price = priceValue;
          messageData.isFree = false;
        }
      }
      
      console.log('Отправка сообщения с медиа:', messageData);
      
      // Отправляем сообщение
      const messageResponse = await fetch(
        `${API_BASE_URL}/${ACCOUNT_ID}/chats/${chatId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );
      
      if (!messageResponse.ok) {
        console.error(`Ошибка отправки сообщения: ${messageResponse.status}`);
        const errorData = await messageResponse.json();
        return NextResponse.json(
          { error: 'Ошибка отправки сообщения с медиа', details: errorData },
          { status: messageResponse.status }
        );
      }
      
      const messageResponseData = await messageResponse.json();
      console.log('Ответ API отправки сообщения:', messageResponseData);
      
      return NextResponse.json({
        success: true,
        message: messageResponseData.data
      });
    } 
    // Обработка JSON запросов (для текстовых сообщений)
    else {
      let jsonData;
      try {
        jsonData = await request.json();
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
        return NextResponse.json({ error: 'Неверный формат JSON' }, { status: 400 });
      }
      
      const text = jsonData.text || '';
      // Добавляем другие параметры, если они есть
      const messageData: any = { text };
      
      if (jsonData.price !== undefined) {
        messageData.price = jsonData.price;
      }
      
      if (jsonData.isFree !== undefined) {
        messageData.isFree = jsonData.isFree;
      }
      
      console.log('Отправка текстового сообщения:', messageData);
      
      // Отправляем сообщение через API OnlyFans
      const response = await fetch(
        `${API_BASE_URL}/${ACCOUNT_ID}/chats/${chatId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Ошибка отправки сообщения:', data);
        return NextResponse.json({ error: data }, { status: response.status });
      }
      
      // Возвращаем ответ от API
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Ошибка в API сообщений:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 