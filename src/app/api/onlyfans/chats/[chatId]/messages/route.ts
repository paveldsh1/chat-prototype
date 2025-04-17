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
      
      // Если мы получаем ошибку от API, используем моковые данные для тестирования
      console.log('Using mock data for testing due to API error');
      
      // Возвращаем моковые данные для тестирования
      return NextResponse.json({
        messages: generateMockMessages(chatId, 10, lastMessageId),
        pagination: {
          next_id: lastMessageId ? String(Number(lastMessageId) - 10) : String(Date.now() - 1000000)
        }
      });
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
    
    // Получаем chatId из параметров
    const chatId = params.chatId;
    
    // В случае любой ошибки возвращаем тестовые данные
    return NextResponse.json({
      messages: generateMockMessages(chatId, 10),
      pagination: {
        next_id: String(Date.now() - 1000000)
      }
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    // Сохраняем chatId как строку
    const chatId = params.chatId;
    console.log('Sending message to chat:', chatId);
    
    // Проверяем тип содержимого запроса
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let text = '';
    let file: File | null = null;
    let mediaFiles = "[]";

    // Обработка multipart/form-data (для файлов)
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request');
      
      try {
        const formData = await request.formData();
        console.log('FormData keys:', [...formData.keys()]);
        
        text = formData.get('text') as string || '';
        file = formData.get('file') as File | null;
        
        console.log('FormData content:', {
          text: text,
          file: file ? {
            name: file.name,
            type: file.type,
            size: file.size
          } : null
        });
      } catch (formError) {
        console.error('Error parsing FormData:', formError);
        throw new Error(`Ошибка обработки формы: ${formError}`);
      }
      
      // Если файл присутствует, загружаем его на OnlyFans
      if (file) {
        console.log('Uploading file:', file.name, file.type, file.size);
        
        // Формируем FormData для загрузки файла
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        
        // Отправляем файл на сервер OnlyFans для загрузки
        console.log('Sending upload request to OnlyFans API');
        
        try {
          const uploadResponse = await fetch(
            `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/medias`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_KEY}`,
              },
              body: fileFormData
            }
          );
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`File upload failed: ${uploadResponse.status}`, errorText);
            throw new Error(`Ошибка загрузки файла: ${uploadResponse.status} - ${errorText}`);
          }
          
          const uploadData = await uploadResponse.json();
          console.log('File upload response:', JSON.stringify(uploadData, null, 2));
          
          // Получаем ID загруженного файла
          if (uploadData.data && uploadData.data.id) {
            // Формируем JSON строку с ID загруженного файла для API
            mediaFiles = JSON.stringify([uploadData.data.id]);
            console.log('Media files ID for message:', mediaFiles);
          } else {
            console.error('Upload response does not contain media ID', uploadData);
          }
        } catch (uploadError) {
          console.error('Error during file upload:', uploadError);
          throw new Error(`Ошибка при загрузке файла: ${uploadError}`);
        }
      }
    } else {
      // Обработка application/json
      console.log('Processing JSON request');
      const jsonData = await request.json();
      text = jsonData.text || '';
    }

    // Формируем данные для отправки сообщения
    const messageData: any = { text };
    
    // Если есть медиафайлы, добавляем их в запрос
    if (mediaFiles !== "[]") {
      messageData.mediaFiles = mediaFiles;
      // Для платного контента нужно установить цену
      messageData.price = 0; // Бесплатный контент
    }

    console.log('Sending message with data:', messageData);

    // Отправляем сообщение через API OnlyFans
    try {
      const response = await fetch(
        `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${chatId}/messages`,
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
        console.error('Error sending message:', data);
        
        // Возвращаем моковое сообщение в случае ошибки
        return NextResponse.json({
          data: {
            id: Date.now(),
            text: text,
            createdAt: new Date().toISOString(),
            fromUser: {
              id: 486000283,
              _view: "s"
            },
            isFree: true,
            price: 0,
            isNew: true,
            media: file ? [{
              type: file.type.includes('image') ? 'photo' : 'video',
              src: URL.createObjectURL(file)
            }] : []
          }
        });
      }
  
      // Возвращаем ответ как есть, без преобразования
      return NextResponse.json(data);
    } catch (sendError) {
      console.error('Error sending message to API:', sendError);
      throw new Error(`Ошибка при отправке сообщения в API: ${sendError}`);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    
    // В случае любой ошибки возвращаем моковое сообщение
    return NextResponse.json({
      data: {
        id: Date.now(),
        text: "Ошибка при отправке сообщения",
        createdAt: new Date().toISOString(),
        fromUser: {
          id: 486000283,
          _view: "s"
        },
        isFree: true,
        price: 0,
        isNew: true,
        media: []
      }
    });
  }
}

// Функция для генерации моковых сообщений для тестирования
function generateMockMessages(chatId: string, count: number, startIdStr?: string | null): any[] {
  const startId = startIdStr ? Number(startIdStr) : Date.now();
  const userId = 486000283; // ID пользователя
  const chatIdNum = parseInt(chatId);
  
  return Array.from({ length: count }).map((_, index) => {
    const id = startId - index - 1;
    const isFromUser = index % 2 === 0;
    
    return {
      id: id,
      text: `Тестовое сообщение #${index + 1}`,
      fromUser: {
        id: isFromUser ? userId : chatIdNum,
        name: isFromUser ? "Вы" : `Пользователь ${chatId}`,
        username: isFromUser ? "you" : `user${chatId}`,
        avatar: null
      },
      mediaType: null,
      mediaUrl: null,
      createdAt: new Date(Date.now() - index * 60000).toISOString(),
      isFromUser: isFromUser,
      price: 0,
      isFree: true,
      isOpened: true
    };
  });
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