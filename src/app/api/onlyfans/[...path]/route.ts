import { NextRequest, NextResponse } from 'next/server';

const API_KEY = 'ofapi_wiBTRr5SQwG9WPCydWm6wQx5nhUbAN7ayXA21NH07dfd1f82';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';
const API_BASE_URL = 'https://app.onlyfansapi.com/api';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  debugger
  // Обработка авторизации модели
  if (params.path[0] === 'authenticate') {
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        const response = await fetch(`${API_BASE_URL}/authenticate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body)
        });
        debugger

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } catch (error) {
        console.error('Model Auth Error:', error);
        return NextResponse.json(
          { error: 'Failed to authenticate model' },
          { status: 500 }
        );
      }
    } else if (req.method === 'GET' && params.path[1]) {
      // Проверка статуса авторизации
      try {
        const attemptId = params.path[1];
        const response = await fetch(`${API_BASE_URL}/authenticate/${attemptId}`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json',
          }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } catch (error) {
        console.error('Auth Status Error:', error);
        return NextResponse.json(
          { error: 'Failed to check authentication status' },
          { status: 500 }
        );
      }
    }
  }

  // Специальная обработка для проверки аккаунта
  if (params.path[0] === 'me') {
    try {
      const response = await fetch(`${API_BASE_URL}/${ACCOUNT_ID}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        }
      });

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Auth Error:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with OnlyFans API' },
        { status: 500 }
      );
    }
  }

  // Обычная обработка других запросов
  const path = params.path.join('/');
  const apiPath = path === 'chats' 
    ? `/${ACCOUNT_ID}/chats`
    : `/${path}`;
  const method = req.method;

  try {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method,
      headers,
      ...(method === 'POST' ? { body: JSON.stringify(await req.json()) } : {})
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request to OnlyFans API' },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST }; 