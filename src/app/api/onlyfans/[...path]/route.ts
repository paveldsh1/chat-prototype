import { NextRequest, NextResponse } from 'next/server';

const API_KEY = 'ofapi_wiBTRr5SQwG9WPCydWm6wQx5nhUbAN7ayXA21NH07dfd1f82';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';
const API_BASE_URL = 'https://app.onlyfansapi.com/api';

async function handler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
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
  const path = `/${params.path.join('/')}`;
  const method = req.method;

  try {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
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