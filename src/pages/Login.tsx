import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Headphones, Lock, User, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Password recovery
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoverySending, setRecoverySending] = useState(false);
  
  // Sign up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  
  const { login, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkIfUsersExist();
  }, []);

  const checkIfUsersExist = async () => {
    try {
      const { data, error } = await supabase.rpc('check_has_users');
      
      if (error) throw error;
      
      const usersExist = !!data;
      setHasUsers(usersExist);
      
      // Se não há usuários, forçar modo de cadastro
      if (!usersExist) {
        setIsSignUpMode(true);
      }
    } catch (error) {
      console.error('Error checking users:', error);
      setHasUsers(true); // Assume que há usuários em caso de erro
    } finally {
      setCheckingUsers(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        toast.error('Usuário ou senha inválidos');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRecovery = async () => {
    const value = recoveryIdentifier.trim();

    if (!value) {
      toast.error('Digite seu usuário ou email');
      return;
    }

    setRecoverySending(true);
    try {
      let email: string | null = null;

      if (value.includes('@')) {
        email = value;
      } else {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', value)
          .maybeSingle();

        if (error) throw error;
        email = profile?.email ?? null;
      }

      // Mensagem genérica para não expor se o usuário existe ou não
      if (email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }

      toast.success('Se o usuário existir, enviamos um email para redefinir a senha.');
      setRecoveryOpen(false);
    } catch (error: any) {
      console.error('Password recovery error:', error);
      toast.error(error?.message || 'Não foi possível enviar o email de recuperação');
    } finally {
      setRecoverySending(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validações
    if (signUpPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (!signUpEmail.includes('@')) {
      toast.error('Digite um email válido');
      setIsLoading(false);
      return;
    }

    try {
      const isFirstUser = !hasUsers;
      const success = await signUp({
        name: signUpName,
        username: signUpUsername,
        email: signUpEmail,
        password: signUpPassword,
        isFirstUser
      });

      if (success) {
        toast.success(isFirstUser 
          ? 'Conta de administrador criada com sucesso!' 
          : 'Conta criada! Faça login para continuar.'
        );
        
        // Auto-login após cadastro
        const loginSuccess = await login(signUpUsername, signUpPassword);
        if (loginSuccess) {
          navigate('/dashboard');
        } else {
          setIsSignUpMode(false);
          setHasUsers(true);
        }
      }
    } catch (error: any) {
      console.error('SignUp error:', error);
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
              <Headphones className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Suporte Técnico</h1>
            <p className="text-muted-foreground mt-2">
              {isSignUpMode && !hasUsers 
                ? 'Primeiro Acesso - Crie o Administrador'
                : isSignUpMode 
                  ? 'Criar Nova Conta' 
                  : 'Sistema de Chamados'
              }
            </p>
          </div>

          {isSignUpMode ? (
            // Formulário de Cadastro
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signUpName" className="text-foreground">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signUpName"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signUpUsername" className="text-foreground">Username (para login)</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signUpUsername"
                    type="text"
                    placeholder="Digite um username"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signUpEmail" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signUpEmail"
                    type="email"
                    placeholder="Digite seu email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signUpPassword" className="text-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signUpPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="glow"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : !hasUsers ? 'Criar Conta de Administrador' : 'Criar Conta'}
              </Button>

              {hasUsers && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUpMode(false)}
                    className="text-sm text-primary hover:underline"
                  >
                    Já tem conta? Faça login
                  </button>
                </div>
              )}
            </form>
          ) : (
            // Formulário de Login
            <>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Digite seu usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="glow"
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryIdentifier(username?.trim() || '');
                      setRecoveryOpen(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>

              <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recuperar senha</DialogTitle>
                    <DialogDescription>
                      Informe seu <strong>usuário</strong> ou <strong>email</strong> para receber o link de redefinição.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <Label htmlFor="recoveryIdentifier">Usuário ou email</Label>
                    <Input
                      id="recoveryIdentifier"
                      type="text"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder="Ex.: stone ou seuemail@dominio.com"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRecoveryOpen(false)}
                      disabled={recoverySending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="glow"
                      onClick={handleSendRecovery}
                      disabled={recoverySending}
                    >
                      {recoverySending ? 'Enviando...' : 'Enviar link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
