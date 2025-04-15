import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Загрузка...' 
}: LoadingSpinnerProps) {
  
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`${sizeMap[size]} animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent`}
      />
      {text && (
        <p className="mt-2 text-gray-600">{text}</p>
      )}
    </div>
  );
} 