import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/api/repository';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await auth.signInWithEmail(email, password);
      if (data?.user) {
        toast.success('Sesión iniciada correctamente');
        navigate('/');
      } else {
        toast.success('Revisa tu correo para continuar');
      }
    } catch (error) {
      console.error('Login fallido:', error);
      toast.error(error?.message || 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
            <p className="text-sm text-slate-500 mt-2">Usa tu correo y contraseña para entrar en la app.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
