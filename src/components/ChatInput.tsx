import { useState, useRef, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, X, DollarSign } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string, file?: File, price?: number) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Создаем URL для превью при выборе файла
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // Очищаем URL при размонтировании компонента
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && !selectedFile) return;
    
    onSendMessage(text, selectedFile || undefined, selectedFile ? price : undefined);
    setText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrice(0);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrice(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    // Проверяем, что значение не отрицательное и не NaN
    if (!isNaN(value) && value >= 0) {
      setPrice(value);
    } else {
      setPrice(0);
    }
  };

  return (
    <div className="w-full bg-white">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        {selectedFile && (
          <div className="p-3 bg-gray-100 rounded-md flex items-start">
            <div className="flex-1 flex items-center gap-3">
              {previewUrl && (
                <div className="relative w-16 h-16 rounded overflow-hidden border border-gray-300">
                  <img 
                    src={previewUrl} 
                    alt="Предпросмотр" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} КБ
                </p>
                
                <div className="mt-2 flex items-center">
                  <div className="relative flex items-center">
                    <DollarSign className="h-4 w-4 absolute left-2 text-gray-500" />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={price}
                      onChange={handlePriceChange}
                      className="pl-8 pr-2 py-1 w-24 text-sm border rounded"
                      placeholder="Цена"
                    />
                  </div>
                  <span className="ml-2 text-xs text-gray-500">
                    {price > 0 ? 'Платный контент' : 'Бесплатно'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите сообщение..."
            disabled={isLoading}
            className="flex-1"
          />

          <Button 
            type="submit" 
            disabled={isLoading || (!text.trim() && !selectedFile)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 h-10"
          >
            <Send className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            onClick={handleFileSelect}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 h-10 flex items-center gap-1"
            style={{
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              animation: 'pulse 2s infinite'
            }}
          >
            <Paperclip className="h-5 w-5" />
            <span className="hidden sm:inline">Фото</span>
            <style jsx global>{`
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                70% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
                100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
              }
            `}</style>
          </Button>
        </div>
      </form>
    </div>
  );
} 