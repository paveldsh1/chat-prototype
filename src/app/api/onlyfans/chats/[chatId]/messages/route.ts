import { NextResponse } from 'next/server';

// Константы для API
const API_KEY = 'ofapi_p0wHp23pKLWlqemuMm4gQ2kIuXzqdkp34MYn0E9B081dedfb';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';

// Добавляем поддержку CORS и OPTIONS запросов
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    // Деструктурируем chatId из params
    const { chatId } = params;

    // Получаем параметры запроса
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '30';
    const lastMessageId = url.searchParams.get('id');
    
    // Формируем URL с учетом параметров пагинации
    let apiUrl = `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${chatId}/messages?limit=${limit}`;
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
      
      // Если мы получаем ошибку от API, используем моковые данные для тестирования
      const mockMessages = generateMockMessages(chatId, 10, lastMessageId);
      
      // Сортируем моковые сообщения по дате - новые сначала
      mockMessages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return NextResponse.json({
        messages: mockMessages,
        pagination: {
          next_id: lastMessageId ? String(Number(lastMessageId) - 10) : String(Date.now() - 1000000)
        }
      });
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
      // Безопасно преобразуем chatId в число для сравнения
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

    // Сортируем сообщения по дате - новые сначала (хотя API должен уже так возвращать)
    messages.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
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
    
    // Извлекаем chatId из params напрямую для мока
    const { chatId } = params;
    
    // В случае любой ошибки возвращаем тестовые данные
    const mockMessages = generateMockMessages(chatId, 10);
    
    // Сортируем моковые сообщения по дате - новые сначала
    mockMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json({
      messages: mockMessages,
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
    // Деструктурируем chatId сразу из params
    const { chatId } = params;
    
    // Проверяем тип содержимого запроса
    const contentType = request.headers.get('content-type') || '';
    
    let text = '';
    let file: File | null = null;
    let mediaFiles = "[]";
    // Инициализируем переменные цены за пределами условий
    let priceParam: FormDataEntryValue | null = null;
    let price = 0;

    // Обработка multipart/form-data (для файлов)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        
        text = formData.get('text') as string || '';
        file = formData.get('file') as File | null;
        
        // Получаем параметр price из формы, если он есть
        priceParam = formData.get('price');
        price = priceParam ? Number(priceParam) : 0;
      } catch (formError) {
        console.error('Error parsing FormData:', formError);
        throw new Error(`Ошибка обработки формы: ${formError}`);
      }
      
      // Если файл присутствует, загружаем его на OnlyFans
      if (file) {
        // Формируем FormData для загрузки файла
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        
        try {
          console.log('Загружаем файл:', file.name, 'тип:', file.type, 'размер:', file.size);
          
          // Правильный API URL для загрузки медиа
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
          console.log('Ответ от API загрузки файла:', JSON.stringify(uploadData, null, 2));
          
          // Получаем ID загруженного файла
          if (uploadData.data && uploadData.data.id) {
            // Сохраняем ID медиа-файла в переменную для дальнейшего использования
            const mediaId = uploadData.data.id;
            console.log('Получен ID медиа:', mediaId);
            
            // Формируем массив ID медиа-файлов для API
            mediaFiles = JSON.stringify([mediaId]);
            
            // Важно: логируем ID медиа-файла для отладки
            console.log('Массив ID медиа-файлов для отправки:', mediaFiles);
          } else {
            console.error('Upload response does not contain media ID', uploadData);
            throw new Error('Ответ API не содержит ID загруженного файла');
          }
        } catch (uploadError) {
          console.error('Error during file upload:', uploadError);
          throw new Error(`Ошибка при загрузке файла: ${uploadError}`);
        }
      }
    } else {
      // Обработка application/json
      const jsonData = await request.json();
      text = jsonData.text || '';
    }

    // Формируем данные для отправки сообщения по API OnlyFans
    const messageData: any = { 
      text: text || " " 
    };

    // Добавляем user_id для совместимости с API OnlyFans
    // Документация требует user_id вместо chatId в параметрах
    messageData.user_id = chatId;

    // Если есть медиафайлы, добавляем их в запрос
    if (mediaFiles !== "[]") {
      // Важное исправление: OnlyFans API ожидает параметр mediaFiles (согласно документации)
      try {
        const mediaIdsArray = JSON.parse(mediaFiles);
        console.log('Преобразованный массив ID медиа:', mediaIdsArray);
        
        // Пробуем разные варианты параметров согласно документации
        // Вариант 1: mediaFiles как в старой документации
        messageData.mediaFiles = mediaIdsArray;
        
        // Вариант 2: media_ids как в новой документации
        messageData.media_ids = mediaIdsArray;
        
        // ВАЖНО: устанавливаем цену для контента, даже если он бесплатный
        // Документация требует указывать цену для медиафайлов
        messageData.price = price;
        
        // Логируем итоговые данные для отправки
        console.log('Итоговые данные для отправки:', JSON.stringify(messageData, null, 2));
      } catch (parseError) {
        console.error('Ошибка при парсинге массива ID медиа:', parseError);
        throw new Error('Невозможно преобразовать список ID медиа для отправки');
      }
    }

    // Отправляем сообщение через API OnlyFans
    try {
      // Исправляем URL эндпоинта согласно документации
      const apiUrl = `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/send-message`;
      console.log('Отправляем запрос на URL:', apiUrl);
      console.log('Тело запроса:', JSON.stringify(messageData, null, 2));
      
      const response = await fetch(
        apiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      // Читаем тело ответа в текстовом формате
      const responseText = await response.text();
      console.log('Получен ответ, статус:', response.status, 'Тело:', responseText.substring(0, 500));
      
      // Парсим JSON, если возможно
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ ОШИБКА ПАРСИНГА JSON:', jsonError);
        data = { error: 'Неверный формат JSON', rawResponse: responseText };
      }

      if (!response.ok) {
        console.error('❌ ОШИБКА ПРИ ОТПРАВКЕ СООБЩЕНИЯ:', data);
        
        // Возвращаем сообщение об ошибке от API, если оно есть
        return NextResponse.json({
          error: true,
          message: data.message || data.error || 'Ошибка при отправке сообщения',
          data: {
            id: Date.now(),
            text: text,
            createdAt: new Date().toISOString(),
            fromUser: {
              id: 486000283,
              _view: "s"
            },
            isFree: price === 0,
            price: price,
            isNew: true,
            media: []
          }
        });
      }

      // Логируем в консоль ID медиа, если они есть в ответе
      if (data.data && data.data.media && data.data.media.length > 0) {
        console.log('Response media file IDs:', data.data.media.map((m: any) => m.id));
      }

      // Возвращаем ответ как есть
      console.log('✅ СООБЩЕНИЕ УСПЕШНО ОТПРАВЛЕНО');
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