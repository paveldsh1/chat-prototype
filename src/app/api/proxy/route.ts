import { NextRequest, NextResponse } from 'next/server';

/**
 * Извлекает IP-адрес из URL OnlyFans
 */
function extractIpAddressFromUrl(url: string): string | null {
  try {
    // Проверяем различные форматы IP-адресов в URL
    const ipPatterns = [
      /"IpAddress":\{"AWS:SourceIp":"([^"\/]+)/i,  // Основной формат в Policy
      /IpAddress".*?"AWS:SourceIp":"([^"\/]+)/i,   // Вариант с любыми символами между
      /"AWS:SourceIp":"([^"\/]+)/i,                // Упрощенный вариант
      /IpAddress.*?SourceIp.*?([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i, // Простой поиск по IP-формату
    ];

    for (const pattern of ipPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Получаем IP без маски подсети (/32)
        return match[1].replace(/\\\/32$/, '').replace(/\/32$/, '');
      }
    }
    
    // Пытаемся найти любой валидный IP-адрес в URL
    const ipMatch = url.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
    if (ipMatch && ipMatch[1]) {
      return ipMatch[1];
    }
    
    console.log('IP не найден в URL:', url);
    return null;
  } catch (error) {
    console.error('Ошибка при извлечении IP из URL:', error);
    return null;
  }
}

/**
 * Обрабатывает ответ от сервера, включая редиректы
 */
async function handleResponse(response: Response, targetIp: string): Promise<Response> {
  // Если получили редирект, следуем за ним
  if (response.redirected || response.status === 302 || response.status === 301) {
    const redirectUrl = response.url || response.headers.get('location');
    
    if (redirectUrl) {
      console.log(`Следуем за редиректом: ${redirectUrl}`);
      
      // Выполняем новый запрос по URL редиректа
      const redirectResponse = await fetch(redirectUrl, {
        method: 'GET',
        headers: {
          'X-Forwarded-For': targetIp,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://onlyfans.com/'
        }
      });
      
      // Рекурсивно обрабатываем ответ на случай цепочки редиректов
      return handleResponse(redirectResponse, targetIp);
    }
  }
  
  return response;
}

/**
 * Обработчик запросов для проксирования с подменой IP
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const forceIp = request.nextUrl.searchParams.get('ip'); // Опционально можно указать IP вручную
  
  if (!url) {
    return NextResponse.json(
      { error: 'Отсутствует параметр URL' },
      { status: 400 }
    );
  }

  try {
    // Извлекаем IP-адрес из URL или используем переданный IP
    const targetIp = forceIp || extractIpAddressFromUrl(url);
    debugger
    if (!targetIp) {
      return NextResponse.json(
        { error: 'Не удалось извлечь IP-адрес из URL' },
        { status: 400 }
      );
    }

    console.log(`Проксирование запроса с IP: ${targetIp}, URL: ${url}`);

    // Оригинальный URL, который используется клиентом сервера
    const originalRequestIp = request.headers.get('x-forwarded-for') || 
                             request.headers.get('x-real-ip') || 
                             '127.0.0.1';
                             
    console.log(`Оригинальный IP клиента: ${originalRequestIp}, Подмена на: ${targetIp}`);

    // Создаем новый запрос к целевому URL
    const initialResponse = await fetch(url, {
      method: 'GET',
      headers: {
        // Устанавливаем заголовок X-Forwarded-For для подмены IP
        'X-Forwarded-For': targetIp,
        'X-Real-IP': targetIp,
        'CF-Connecting-IP': targetIp, // Заголовок для Cloudflare
        // Имитируем реальный браузер
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://onlyfans.com/',
        'Origin': 'https://onlyfans.com'
      }
    });
    
    // Обрабатываем ответ, включая редиректы
    const response = await handleResponse(initialResponse, targetIp);

    // Если запрос не удачный, возвращаем ошибку
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Ошибка при проксировании: ${response.status} ${response.statusText}`,
          targetIp,
          url: response.url
        },
        { status: response.status }
      );
    }

    // Получаем тип содержимого из ответа
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Клонируем все заголовки из ответа
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'public, max-age=86400'); // Кэширование на 24 часа
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // Добавляем информацию об использованном IP для отладки
    responseHeaders.set('X-Proxy-Target-IP', targetIp);
    
    // Возвращаем проксированный ответ с тем же content-type
    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Ошибка при проксировании:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при проксировании' },
      { status: 500 }
    );
  }
} 