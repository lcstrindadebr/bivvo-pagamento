import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Handshake, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
import bivvoLogo from '@/assets/bivvo-logo.png';

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
      if (!aff) { await supabase.auth.signOut(); throw new Error('Acesso negado. Usuário não cadastrado como afiliado.'); }
      if (aff.status !== 'active') { await supabase.auth.signOut(); throw new Error('Seu cadastro está pendente ou inativo.'); }
      navigate('/afiliado');
    } catch (err) {
      toast({ 
        title: 'Falha no acesso', 
        description: err instanceof Error ? err.message : 'Erro ao realizar login', 
        variant: 'destructive' 
      });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Visual Side */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border border-white/20 rounded-full" />
          <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] border border-white/20 rounded-full" />
        </div>
        <div className="relative z-10 max-w-md text-white">
          <TrendingUp className="w-12 h-12 mb-6 text-accent" />
          <h2 className="text-4xl font-bold mb-6 tracking-tight">Potencialize seus ganhos com a Bivvo.</h2>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Acesse seu dashboard de parceiro para acompanhar conversões, gerenciar links e otimizar suas campanhas em tempo real.
          </p>
          <div className="flex items-center gap-4 py-4 px-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium">Dados atualizados</p>
              <p className="text-xs text-white/50">Métricas em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white md:bg-transparent">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 text-center md:text-left">
            <img src={bivvoLogo} alt="Bivvo" className="h-8 mb-10 mx-auto md:mx-0" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-[11px] font-semibold uppercase tracking-wider text-accent mb-4">
              <Handshake className="w-3.5 h-3.5" />
              Portal do Afiliado
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo de volta</h1>
            <p className="mt-2 text-slate-500">Insira suas credenciais de parceiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-slate-200 focus:border-accent focus:ring-accent/5 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" text-sm font-medium text-slate-700>Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-slate-200 focus:border-accent focus:ring-accent/5 transition-all"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl shadow-lg shadow-accent/10 transition-all flex items-center justify-center gap-2 group mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Acessar Painel
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center md:text-left">
            <p className="text-sm text-slate-500">
              Ainda não é um parceiro? {' '}
              <Link to="/" className="text-accent font-semibold hover:underline">Saiba mais</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}