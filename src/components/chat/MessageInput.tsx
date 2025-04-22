import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, ChangeEvent } from "react";
import { Paperclip, X } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: () => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  mediaPrice: string;
  setMediaPrice: (price: string) => void;
  isSending: boolean;
}

export default function MessageInput({
  onSendMessage,
  newMessage,
  setNewMessage,
  selectedFile,
  setSelectedFile,
  previewUrl,
  setPreviewUrl,
  mediaPrice,
  setMediaPrice,
  isSending
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaPrice("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="sticky bottom-0 p-4 border-t bg-white mt-auto">
      <div className="flex flex-col gap-2">
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
                  <label className="text-xs text-gray-700 mr-2">Цена:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="text-xs p-1 w-16 border border-gray-300 rounded"
                    value={mediaPrice}
                    onChange={(e) => setMediaPrice(e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 ml-1">$</span>
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
        
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
            disabled={isSending}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            disabled={isSending}
          />
          <Button 
            onClick={onSendMessage}
            disabled={isSending || (!newMessage.trim() && !selectedFile)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSending ? 'Отправка...' : 'Отправить'}
          </Button>
          <Button 
            type="button"
            onClick={handleFileSelect}
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
            disabled={isSending}
          >
            <Paperclip className="h-5 w-5" />
            <span className="hidden sm:inline">Фото</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 