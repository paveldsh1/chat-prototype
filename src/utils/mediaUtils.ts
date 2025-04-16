/**
 * Извлекает IP-адрес из URL OnlyFans
 * У ссылок OnlyFans часто есть ограничения по IP в запросе авторизации
 * Например, в URL может быть JSON строка вида: "IpAddress":{"AWS:SourceIp":"83.242.100.243\/32"}
 */
export function extractIpFromUrl(url: string): string | null {
  try {
    // Проверяем, содержит ли URL строку с IP-адресом
    const ipMatch = url.match(/"IpAddress".*?"AWS:SourceIp"\s*:\s*"([^"]+)"/);
    if (ipMatch && ipMatch[1]) {
      console.log('Извлечен IP из URL:', ipMatch[1]);
      return ipMatch[1].replace(/\\\/\d+$/, ''); // Удаляем маску подсети, если есть
    }
    
    // Если стандартный формат не найден, ищем альтернативные форматы
    const altMatch = url.match(/ip=([0-9.]+)/i);
    if (altMatch && altMatch[1]) {
      console.log('Извлечен альтернативный IP из URL:', altMatch[1]);
      return altMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при извлечении IP из URL:', error);
    return null;
  }
}

/**
 * Нормализует URL изображения
 * Используется вместо проксирования для прямой загрузки изображений
 */
export function normalizeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // Удаляем лишние пробелы
  let normalizedUrl = url.trim();
  
  // Возвращаем нормализованный URL
  return normalizedUrl;
} 