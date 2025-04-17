import { NextResponse } from 'next/server';

// Константы для API
const API_KEY = 'ofapi_p0wHp23pKLWlqemuMm4gQ2kIuXzqdkp34MYn0E9B081dedfb';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';
// Возвращаем правильный URL API, который работает с нашим ключом
const ONLYFANS_API_URL = 'https://app.onlyfansapi.com/api';

// CORS поддержка
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Получаем chatId асинхронно
    const chatId = await Promise.resolve(params.chatId);

    // Параметры запроса
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '30';
    const lastMessageId = url.searchParams.get('id');
    
    // Формируем URL с параметрами пагинации
    let apiUrl = `${ONLYFANS_API_URL}/${ACCOUNT_ID}/chats/${chatId}/messages?limit=${limit}`;
    if (lastMessageId) {
      apiUrl += `&id=${lastMessageId}`;
    }
    
    console.log('Fetching messages from:', apiUrl);
    
    // Запрос к OnlyFans API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API returned ${response.status}: ${errorText}`);
      
      // Возвращаем моковые данные при ошибке
      const mockMessages = generateMockMessages(chatId, 10, lastMessageId);
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
    
    // Преобразуем ответ API
    const messages = rawData.data.list.map((msg: any) => {
      const chatIdNum = parseInt(chatId);
      
      return {
        id: msg.id,
        text: msg.text?.replace(/<[^>]*>/g, '') || '',
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
        media: msg.media || [],
        mediaCount: msg.media?.length || 0,
        isMediaReady: msg.isMediaReady
      };
    });

    // Сортируем по дате (новые сначала)
    messages.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json({
      messages,
      pagination: {
        next_id: rawData._pagination?.next_page ? 
          new URL(rawData._pagination.next_page).searchParams.get('id') : 
          null
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // В случае ошибки возвращаем тестовые данные
    const chatId = await Promise.resolve(params.chatId);
    const mockMessages = generateMockMessages(chatId, 10);
    
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
    const chatId = await Promise.resolve(params.chatId);
    const contentType = request.headers.get('content-type') || '';
    
    let text = '';
    let file: File | null = null;
    let mediaId: string | null = null;
    let price = 0;

    console.log('Content-Type:', contentType);

    // Обработка формы с файлом
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        console.log('FormData fields:', [...formData.keys()]);
        
        text = formData.get('text') as string || '';
        file = formData.get('file') as File | null;
        
        const priceParam = formData.get('price');
        price = priceParam ? Number(priceParam) : 0;
        
        console.log('Received file:', file?.name, file?.type, file?.size);
      } catch (formError) {
        console.error('Error parsing FormData:', formError);
        throw new Error(`Ошибка обработки формы: ${formError}`);
      }
      
      // Загрузка файла (если есть)
      if (file) {
        try {
          // 1. Сначала загружаем файл через media endpoint
          console.log('Uploading file to OnlyFans API...');
          
          const mediaFormData = new FormData();
          mediaFormData.append('media', file);
          mediaFormData.append('media_type', file.type.startsWith('image/') ? 'photo' : 'video');
          
          // Правильный эндпоинт для загрузки файла
          const uploadUrl = `${ONLYFANS_API_URL}/${ACCOUNT_ID}/medias`;
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              // Не устанавливаем Content-Type, браузер делает это автоматически с boundary
            },
            body: mediaFormData
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`File upload failed: ${uploadResponse.status}`, errorText);
            throw new Error(`Ошибка загрузки файла: ${uploadResponse.status} - ${errorText}`);
          }
          
          const uploadData = await uploadResponse.json();
          console.log('Upload response:', uploadData);
          
          // Получаем media_id из ответа
          if (uploadData.data && uploadData.data.id) {
            mediaId = uploadData.data.id.toString();
            console.log('Got media_id:', mediaId);
          } else {
            console.error('Upload response does not contain media_id', uploadData);
            throw new Error('API не вернул media_id');
          }
        } catch (uploadError) {
          console.error('Error during file upload:', uploadError);
          throw new Error(`Ошибка при загрузке файла: ${uploadError}`);
        }
      }
    } else {
      // Обработка JSON
      const jsonData = await request.json();
      text = jsonData.text || '';
    }

    // Отправка сообщения
    const messageData: any = {
      user_id: parseInt(chatId),
      text: text || " "
    };

    // Добавляем media_ids если есть загруженный файл
    if (mediaId) {
      messageData.media_ids = [mediaId];
      
      // Цена, если задана
      if (price > 0) {
        messageData.price = price;
      }
    }

    console.log('Sending message with data:', JSON.stringify(messageData));

    // Отправляем сообщение в чат
    try {
      // Правильный эндпоинт для отправки сообщений
      const apiUrl = `${ONLYFANS_API_URL}/${ACCOUNT_ID}/chats/send-message`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        data = { error: 'Неверный формат JSON', rawResponse: responseText };
      }

      if (!response.ok) {
        console.error('Failed to send message:', data);
        
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
            media: mediaId ? [{ id: mediaId }] : []
          }
        }, { status: response.status });
      }

      // Успешный ответ
      return NextResponse.json(data);
    } catch (sendError) {
      console.error('Error sending message to API:', sendError);
      throw new Error(`Ошибка при отправке сообщения в API: ${sendError}`);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Возвращаем моковое сообщение
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
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
        media: []
      }
    }, { status: 500 });
  }
}

// Генерация тестовых сообщений
function generateMockMessages(chatId: string, count: number, startIdStr?: string | null): any[] {
  const startId = startIdStr ? Number(startIdStr) : Date.now();
  const userId = 486000283;
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