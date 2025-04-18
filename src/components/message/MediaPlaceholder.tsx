import React from 'react';

// Компонент для отображения плейсхолдера медиа (загрузка или ошибка)
interface MediaPlaceholderProps {
  loading?: boolean;
  error?: boolean;
  message: string;
}

export const MediaPlaceholder: React.FC<MediaPlaceholderProps> = ({ loading, error, message }) => {
  const bgClass = error ? 'bg-red-50' : 'bg-gray-100';
  const textClass = error ? 'text-red-500' : 'text-gray-500';
  
  return (
    <div className={`rounded p-4 text-center ${bgClass}`}>
      <div className={`flex flex-col items-center ${textClass}`}>
        {loading ? (
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : error ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ) : null}
        <span className="mt-2">{message}</span>
      </div>
    </div>
  );
}; 