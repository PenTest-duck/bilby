/**
 * Auth Provider
 * Manages Supabase auth state and syncs with auth store
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          login(
            session.access_token,
            {
              id: session.user.id,
              email: session.user.email,
            }
          );
        } else {
          logout();
        }
      } catch (error) {
        console.error('[Auth] Failed to get session:', error);
        logout();
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          login(
            session.access_token,
            {
              id: session.user.id,
              email: session.user.email,
            }
          );
        } else if (event === 'SIGNED_OUT') {
          logout();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Update token on refresh
          login(
            session.access_token,
            {
              id: session.user.id,
              email: session.user.email,
            }
          );
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading]);

  return <>{children}</>;
}
