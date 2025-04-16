import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Отключаем кэширование (или частично включаем selective-cache)

// Таймаут для fetch (10 секунд)
const FETCH_TIMEOUT = 10000;

// Максимальное количество попыток
const MAX_RETRIES = 2;

// Время хранения кэша (24 часа)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Простой in-memory кэш для избежания повторных запросов к одним и тем же URL
const imageCache: Map<string, { data: ArrayBuffer, contentType: string, timestamp: number }> = new Map();

// Функция для fetch с таймаутом
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Функция для повторных попыток запроса при ошибках
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  timeout: number, 
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // При повторных попытках добавляем параметр для обхода кэша
      const targetUrl = attempt > 0 
        ? `${url}${url.includes('?') ? '&' : '?'}_retry=${attempt}&_t=${Date.now()}`
        : url;
      
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for URL: ${url}`);
      }
      
      const response = await fetchWithTimeout(targetUrl, options, timeout);
      
      // Для ответов кроме 5xx, не пытаемся повторить
      if (response.ok || response.status < 500 || attempt === maxRetries) {
        return response;
      }
      
      console.log(`Fetch attempt ${attempt + 1} failed with status ${response.status}, retrying...`);
    } catch (error) {
      lastError = error;
      
      // Если ошибка из-за таймаута, прекращаем попытки
      if (error.name === 'AbortError') {
        throw error;
      }
      
      console.log(`Fetch attempt ${attempt + 1} failed with error: ${error.message}`);
    }
    
    // Экспоненциальная задержка перед следующей попыткой
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

// Генерирует заголовки для запросов
function getRequestHeaders(domain: string): Record<string, string> {
  // Базовые заголовки, которые подходят для большинства запросов
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Connection': 'keep-alive'
  };
  
  // Дополнительные заголовки для OnlyFans
  if (domain.includes('onlyfans.com')) {
    headers['Referer'] = 'https://onlyfans.com/';
    headers['Origin'] = 'https://onlyfans.com';
    // Можно добавить разные User-Agent для обхода блокировок
    headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
  }
  
  return headers;
}

// Функция для очистки кэша старых изображений
function cleanupOldCache() {
  const now = Date.now();
  let deleted = 0;
  
  for (const [key, item] of imageCache.entries()) {
    if (now - item.timestamp > CACHE_DURATION) {
      imageCache.delete(key);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} cached images`);
  }
}

// Очищаем кэш каждый час
setInterval(cleanupOldCache, 60 * 60 * 1000);

export async function GET(request: Request) {
  // Получаем URL изображения из query-параметра
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');
  const forceFresh = url.searchParams.get('fresh') === 'true';
  
  if (!imageUrl) {
    return new NextResponse(JSON.stringify({ error: 'URL parameter is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  // Деконструируем URL, чтобы убедиться, что он валидный
  let targetUrl;
  try {
    targetUrl = decodeURIComponent(imageUrl);
    new URL(targetUrl); // Проверяем, что URL валидный
  } catch (error) {
    console.error('Invalid URL:', imageUrl);
    return new NextResponse(JSON.stringify({ error: 'Invalid URL' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  // Генерируем кэш-ключ
  const cacheKey = targetUrl;
  
  // Проверяем кэш, если не запрошено свежее изображение
  if (!forceFresh && imageCache.has(cacheKey)) {
    const cachedImage = imageCache.get(cacheKey);
    if (cachedImage) {
      console.log('Serving from cache:', targetUrl);
      return new NextResponse(cachedImage.data, {
        headers: {
          'Content-Type': cachedImage.contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'HIT'
        }
      });
    }
  }
  
  // Обрабатываем запрос к внешнему сервису
  try {
    console.log('Proxying image:', targetUrl);
    
    // Извлекаем домен для настройки заголовков
    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.hostname;
    
    // Получаем заголовки для запроса
    const headers = getRequestHeaders(domain);
    
    // Делаем запрос к целевому URL с таймаутом и повторными попытками
    let response;
    try {
      response = await fetchWithRetry(targetUrl, { headers }, FETCH_TIMEOUT);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Fetch timeout after ${FETCH_TIMEOUT}ms for URL: ${targetUrl}`);
        return new NextResponse(JSON.stringify({ 
          error: 'Request timeout',
          url: targetUrl 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      throw error;
    }
    
    // Если запрос не успешен, возвращаем ошибку
    if (!response.ok) {
      console.error(`Error fetching image: ${response.status} ${response.statusText} from ${targetUrl}`);
      
      // Проверяем, есть ли в URL паттерны, указывающие на полное изображение, и предлагаем уменьшенную версию
      if ((response.status === 404 || response.status === 403) && 
          (targetUrl.includes('3024x4032') || targetUrl.includes('2316x3088'))) {
        // Пытаемся найти pattern уменьшенной версии в URL
        const regex = /(\d+)x(\d+)_([a-f0-9]+)\./i;
        const match = targetUrl.match(regex);
        
        if (match && match[3]) {
          const hash = match[3];
          const smallerSize = '960x1280';
          const possibleFallback = targetUrl.replace(regex, `${smallerSize}_$3.`);
          
          return new NextResponse(JSON.stringify({ 
            error: `Image not available: ${response.status}`,
            url: targetUrl,
            fallbackUrl: possibleFallback,
            timeStamp: new Date().toISOString()
          }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
      
      // Обычная ошибка
      return new NextResponse(JSON.stringify({ 
        error: `Error fetching image: ${response.status}`,
        url: targetUrl
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Получаем тип контента из ответа
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Проверяем, получили ли мы действительно изображение/видео
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      console.warn(`Unexpected content type: ${contentType} for URL: ${targetUrl}`);
      
      return new NextResponse(JSON.stringify({
        error: 'Not an image or video',
        contentType,
        url: targetUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Получаем данные изображения
    const imageData = await response.arrayBuffer();
    
    // Проверяем, не пустой ли ответ
    if (imageData.byteLength === 0) {
      console.error(`Empty response for URL: ${targetUrl}`);
      return new NextResponse(JSON.stringify({
        error: 'Empty response',
        url: targetUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Кэшируем изображение
    imageCache.set(cacheKey, {
      data: imageData,
      contentType,
      timestamp: Date.now()
    });
    
    // Возвращаем изображение с правильным Content-Type
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Кэшируем на 24 часа
        'Access-Control-Allow-Origin': '*', // Разрешаем CORS
        'X-Proxy-Source': domain,
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message || 'Unknown error',
      url: targetUrl
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 