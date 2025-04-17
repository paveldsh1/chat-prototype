import { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => void;
  isLoading?: boolean;
}

export default function MessageInput({ onSendMessage, isLoading = false }: MessageInputProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && !selectedFile) return;
    
    onSendMessage(text, selectedFile || undefined);
    setText("");
    setSelectedFile(null);
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

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 border-t">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
      />

      <div className="flex-1 space-y-2">
        {selectedFile && (
          <div className="p-2 bg-gray-100 rounded-md text-sm flex items-center justify-between">
            <span className="truncate">{selectedFile.name}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFile(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        )}

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите сообщение..."
          disabled={isLoading}
          className="flex-1"
        />
      </div>

      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || (!text.trim() && !selectedFile)}
        className="bg-blue-500 hover:bg-blue-600"
      >
        <Send className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={handleFileSelect}
        disabled={isLoading}
        aria-label="Прикрепить файл"
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2"
      >
        <Paperclip className="h-5 w-5" />
        <span className="hidden sm:inline">Фото</span>
      </Button>
    </form>
  );
} 