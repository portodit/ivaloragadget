import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabaseCustomer } from "@/integrations/supabase/customer-client";

interface CustomerAuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabaseCustomer.auth.onAuthStateChange(
      (_event, sess) => {
        if (!isMounted) return;
        setSession(sess);
        setUser(sess?.user ?? null);
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: sess } } = await supabaseCustomer.auth.getSession();
        if (!isMounted) return;
        setSession(sess);
        setUser(sess?.user ?? null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabaseCustomer.auth.signOut();
  };

  return (
    <CustomerAuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
