import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AuthContextType } from '@/types';

interface SignUpData {
  name: string;
  username: string;
  email: string;
  password: string;
  isFirstUser?: boolean;
}

interface ExtendedAuthContextType extends AuthContextType {
  signUp: (data: SignUpData) => Promise<boolean>;
  mustChangePassword: boolean;
  setMustChangePassword: (v: boolean) => void;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) throw roleError;

      if (profile) {
        const userData: User = {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email || undefined,
          phone: profile.phone || undefined,
          sector_id: profile.sector_id || '',
          role: roleData?.role || 'user',
          active: profile.active ?? true,
          created_at: profile.created_at || new Date().toISOString(),
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const signUp = async (data: SignUpData): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: data.name,
            username: data.username,
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (data.isFirstUser) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', authData.user.id);

        if (roleError) {
          console.error('Error updating role to admin:', roleError);
        }
      }

      return true;
    } catch (error: any) {
      console.error('SignUp error:', error);
      throw error;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username', {
        _username: username,
      });

      if (rpcError || !email) {
        console.error('User not found:', rpcError);
        return false;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      // Wait for profile to be fetched before returning success
      if (authData.user) {
        await fetchUserProfile(authData.user.id);
        // Check if first login
        const meta = authData.user.user_metadata;
        if (meta?.must_change_password) {
          setMustChangePassword(true);
        }
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        signUp,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        mustChangePassword,
        setMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
