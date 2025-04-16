import { NextRequest, NextResponse } from 'next/server';

/**
 * Проксирует запрос изображения с OnlyFans с подменой IP
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const requiredIp = request.nextUrl.searchParams.get('ip');
  
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Проксирование запроса к: ${url}`);
    console.log(`Требуемый IP: ${requiredIp || 'не указан'}`);
    
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://onlyfans.com/',
    };
    
    // Если указан IP, добавляем его в заголовки для имитации запроса с этого IP
    if (requiredIp) {
      headers['X-Forwarded-For'] = requiredIp;
      headers['CF-Connecting-IP'] = requiredIp;
      console.log(`Установлены заголовки подмены IP: ${requiredIp}`);
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`Ошибка при проксировании: ${response.status} ${response.statusText}`);
      
      // Проверяем, связана ли ошибка с доступом (403)
      if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            message: 'Доступ запрещен. Возможная причина - несоответствие IP-адреса.',
            requiredIp,
            statusCode: 403
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Proxy error',
          message: `Ошибка при проксировании: ${response.status} ${response.statusText}`,
          statusCode: response.status
        },
        { status: 502 }
      );
    }
    
    // Получаем тип контента и данные
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const data = await response.arrayBuffer();
    
    // Создаем новый ответ с тем же типом контента и данными
    const proxyResponse = new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return proxyResponse;
  } catch (error) {
    console.error('Ошибка при проксировании запроса:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error',
        message: 'Произошла ошибка при обработке запроса',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
} 