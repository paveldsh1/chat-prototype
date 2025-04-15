import { NextResponse } from 'next/server';

const API_KEY = 'ofapi_wiBTRr5SQwG9WPCydWm6wQx5nhUbAN7ayXA21NH07dfd1f82';
const ACCOUNT_ID = 'acct_601447d3a13342e0a0da8c16aa35ad07';

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const response = await fetch(
      `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${params.chatId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();
    
    // Преобразуем ответ API в формат, ожидаемый клиентом
    const messages = rawData.data.list.map((msg: any) => ({
      id: msg.id,
      text: msg.text.replace(/<[^>]*>/g, ''), // Удаляем HTML теги
      fromUser: msg.fromUser.id !== parseInt(params.chatId), // Инвертируем логику
      timestamp: msg.createdAt,
      isNew: msg.isNew,
      isFree: msg.isFree,
      price: msg.price,
      media: msg.media?.map((m: any) => ({
        id: m.id,
        type: m.type,
        url: m.files?.full?.url || ''
      })) || []
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { text } = await request.json();

    const response = await fetch(
      `https://app.onlyfansapi.com/api/${ACCOUNT_ID}/chats/${params.chatId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to send message' },
        { status: response.status }
      );
    }

    // Возвращаем ответ как есть, без преобразования
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 