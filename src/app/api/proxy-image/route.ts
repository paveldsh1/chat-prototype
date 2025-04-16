import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Проверка на OnlyFans URL
    if (!url.includes('onlyfans.com') && !url.includes('cdn2.onlyfans.com')) {
      return NextResponse.json(
        { error: 'Only OnlyFans URLs are allowed' },
        { status: 400 }
      );
    }

    // Извлекаем IP адрес клиента
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Извлекаем IP адрес из URL OnlyFans
    const ipAddressMatch = url.match(/"IpAddress":\s*{\s*"AWS:SourceIp"\s*:\s*"([^"]+)"/);
    const restrictedIp = ipAddressMatch ? ipAddressMatch[1].replace(/\/32$/, '') : null;
    
    // Проверяем соответствие IP
    const ipMatches = restrictedIp && clientIp.includes(restrictedIp);
    
    // Возвращаем информацию о URL и соответствии IP
    return NextResponse.json({
      url: url,
      hasIpRestriction: !!restrictedIp,
      restrictedToIp: restrictedIp,
      clientIp: clientIp,
      ipMatches: ipMatches,
      message: restrictedIp 
        ? (ipMatches 
          ? 'IP-адрес клиента соответствует ограничению в URL.' 
          : 'IP-адрес клиента НЕ соответствует ограничению в URL.')
        : 'URL не содержит видимых ограничений по IP-адресу.'
    });

  } catch (error) {
    console.error('URL Check Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL' },
      { status: 500 }
    );
  }
} 