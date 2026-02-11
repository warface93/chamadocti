import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const passwordMismatch = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
      setLoadingSession(false);
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (passwordMismatch) {
      toast.error("As senhas não conferem");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Senha atualizada! Faça login com a nova senha.");
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err?.message || "Não foi possível atualizar a senha");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl p-8 border border-border">
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="text-muted-foreground mt-2">
            Volte para o login e solicite novamente a recuperação de senha.
          </p>
          <div className="mt-6">
            <Button className="w-full" variant="glow" onClick={() => navigate("/login")}>Voltar para login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

      <div className="w-full max-w-md relative z-10">
        <div className="glow-card bg-card rounded-2xl p-8 border border-border">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 glow-card">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Definir nova senha</h1>
            <p className="text-muted-foreground mt-2">Escolha uma nova senha para sua conta.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                required
                minLength={6}
              />
              {passwordMismatch && (
                <p className="text-sm text-destructive">As senhas não conferem.</p>
              )}
            </div>

            <Button type="submit" className="w-full" variant="glow" disabled={saving}>
              {saving ? "Salvando..." : "Salvar nova senha"}
            </Button>

            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={() => navigate("/login")}
              disabled={saving}
            >
              Cancelar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
