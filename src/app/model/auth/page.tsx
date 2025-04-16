'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { authenticateModel, pollAuthStatus } from "@/lib/onlyfans-api";
import type { ModelAuth } from "@/lib/onlyfans-api";

export default function ModelAuth() {
  const [formData, setFormData] = useState<ModelAuth>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authenticateModel(formData);
      setAuthStatus('Авторизация начата. Проверяем статус...');
      
      // Начинаем опрашивать статус авторизации
      const interval = setInterval(async () => {
        try {
          const status = await pollAuthStatus(response.attempt_id);
          setAuthStatus('Авторизация успешна!');
          clearInterval(interval);
          // Перенаправляем на страницу чата
          window.location.href = '/';
        } catch (error) {
          if (error instanceof Error && error.message.includes('in progress')) {
            setAuthStatus('Авторизация в процессе...');
          } else {
            setError(error instanceof Error ? error.message : 'Failed to check auth status');
            clearInterval(interval);
          }
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Авторизация модели OnlyFans</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {authStatus && (
          <Alert className="mb-4">
            <AlertDescription>{authStatus}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Введите email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Введите пароль"
              required
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Авторизация...' : 'Войти'}
          </Button>
        </form>
      </Card>
    </div>
  );
} 