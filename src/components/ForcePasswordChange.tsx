import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ForcePasswordChangeProps {
  open: boolean;
  onSuccess: () => void;
}

const ForcePasswordChange = ({ open, onSuccess }: ForcePasswordChangeProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      onSuccess();
    } catch (error: any) {
      const rawMsg = error?.message || '';
      const translated = rawMsg.includes('different from the old password')
        ? 'A nova senha deve ser diferente da senha atual'
        : rawMsg;
      toast.error('Erro ao alterar senha: ' + translated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-card border-border" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Alterar Senha Obrigatória
          </DialogTitle>
          <DialogDescription>
            Este é seu primeiro acesso. Por segurança, altere sua senha antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-secondary/50"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-secondary/50"
              placeholder="Repita a nova senha"
              required
            />
          </div>
          <Button type="submit" variant="glow" className="w-full" disabled={isLoading}>
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordChange;
