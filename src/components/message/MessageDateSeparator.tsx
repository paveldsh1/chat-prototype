import React from 'react';

// Компонент разделителя даты между сообщениями
interface DateSeparatorProps {
  date: string;
}

export const MessageDateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
        {date}
      </div>
    </div>
  );
};

// Функция форматирования даты для разделителя
export const formatDateForSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Форматируем дату в зависимости от того, когда было отправлено сообщение
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  } else {
    // Форматирование даты в локализованном формате
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

// Функция для проверки, нужно ли показывать разделитель даты
export const shouldShowDateSeparator = (currentDate: string, previousDate?: string): boolean => {
  if (!previousDate) return true; // Показываем разделитель для первого сообщения
  
  const current = new Date(currentDate);
  const previous = new Date(previousDate);
  
  // Сравниваем даты без учета времени
  return current.toDateString() !== previous.toDateString();
}; 