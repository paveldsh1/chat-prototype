import { NextRequest, NextResponse } from 'next/server';

// Константы API
const API_BASE_URL = 'https://app.onlyfansapi.com/api';
const API_KEY = 'ofapi_p0wHp23pKLWlqemuMm4gQ2kIuXzqdkp34MYn0E9B081dedfb';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handler(req, params, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handler(req, params, 'POST');
}

async function handler(
  req: NextRequest,
  params: { path: string[] },
  method: string
) {
  // Ожидаем получение параметров перед их использованием
  const path = await Promise.resolve(params.path);
  
  // Обработка авторизации модели
  if (path[0] === 'authenticate') {
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        
        // Здесь будет логика аутентификации
        console.log('Received auth request with keys:', Object.keys(body));
        
        return NextResponse.json({ 
          success: true, 
          token: 'demo_token_123',
          user: {
            id: 1,
            username: 'demo_user',
            name: 'Demo User'
          }
        });
      } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid authentication data' 
        }, { status: 400 });
      }
    }
  }

  // Специальная обработка для проверки аккаунта
  if (path[0] === 'me') {
    try {
      const response = await fetch(`${API_BASE_URL}/${ACCOUNT_ID}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching account data:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch account data' 
      }, { status: 500 });
    }
  }

  // Обычная обработка других запросов
  const pathStr = path.join('/');
  const apiPath = pathStr === 'chats'
    ? `/${ACCOUNT_ID}/chats`
    : `/${pathStr}`;
    
  // Логируем запрос для отладки
  console.log(`Proxying ${req.method} request to ${apiPath}`);

  // Получаем заголовки и параметры запроса
  const headers: HeadersInit = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json',
  };
  
  // Если запрос содержит тело, добавляем его
  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = req.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      body = JSON.stringify(await req.json());
      headers['Content-Type'] = 'application/json';
    } else if (contentType && contentType.includes('multipart/form-data')) {
      body = await req.arrayBuffer();
      // Для multipart/form-data браузер автоматически устанавливает
      // правильный Content-Type с boundary, поэтому не перезаписываем
    } else {
      body = await req.text();
    }
  }

  // Выполняем запрос к OnlyFans API
  try {
    const apiResponse = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: req.method,
      headers,
      body
    });
    
    const data = await apiResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error proxying request to ${apiPath}:`, error);
    return NextResponse.json({
      error: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 