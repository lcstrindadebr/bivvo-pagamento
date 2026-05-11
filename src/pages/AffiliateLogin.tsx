import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Handshake, Loader2 } from 'lucide-react';

export default function AffiliateLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: aff } = await supabase.from('affiliates').select('id, status').eq('user_id', data.user.id).maybeSingle();
      if (!aff) { await supabase.auth.signOut(); throw new Error('Não é afiliado.'); }
      if (aff.status !== 'active') { await supabase.auth.signOut(); throw new Error('Afiliado inativo.'); }
      navigate('/afiliado');
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
            <Handshake className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Área do Afiliado</h1>
        </div>
        <form onSubmit={handleLogin} className="card-glass rounded-2xl p-6 space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
