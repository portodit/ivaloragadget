import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AccountStatus = "pending" | "active" | "suspended" | "rejected";
type AppRole = "super_admin" | "admin_branch" | "employee" | null;

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AccountStatus | null;
  role: AppRole;
  isLoading: boolean;
  activeBranch: BranchInfo | null;
  userBranches: BranchInfo[];
  setActiveBranch: (branch: BranchInfo) => void;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  status: null,
  role: null,
  isLoading: true,
  activeBranch: null,
  userBranches: [],
  setActiveBranch: () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBranch, setActiveBranchState] = useState<BranchInfo | null>(null);
  const [userBranches, setUserBranches] = useState<BranchInfo[]>([]);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes, branchRes] = await Promise.all([
        supabase.from("user_profiles").select("status").eq("id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_branches")
          .select("branch_id, is_default, branches:branch_id(id, name, code)")
          .eq("user_id", userId),
      ]);

      setStatus((profileRes.data?.status as AccountStatus) ?? null);
      const userRole = (roleRes.data?.role as AppRole) ?? null;
      setRole(userRole);

      // Parse branches
      const branches: BranchInfo[] = (branchRes.data ?? [])
        .map((ub: any) => ub.branches)
        .filter(Boolean);
      setUserBranches(branches);

      // Restore active branch from localStorage or pick default
      const storedBranchId = localStorage.getItem(`ivalora_active_branch_${userId}`);
      const storedBranch = branches.find((b) => b.id === storedBranchId);
      const defaultBranch = (branchRes.data ?? []).find((ub: any) => ub.is_default);
      const defaultBranchInfo = defaultBranch ? branches.find((b) => b.id === defaultBranch.branch_id) : null;

      if (storedBranch) {
        setActiveBranchState(storedBranch);
      } else if (defaultBranchInfo) {
        setActiveBranchState(defaultBranchInfo);
      } else if (branches.length === 1) {
        setActiveBranchState(branches[0]);
      } else if (userRole === "super_admin") {
        // Super admin doesn't need a branch, but can pick one
        setActiveBranchState(branches[0] ?? null);
      } else {
        setActiveBranchState(null);
      }
    } catch {
      setStatus(null);
      setRole(null);
      setUserBranches([]);
      setActiveBranchState(null);
    }
  };

  const setActiveBranch = (branch: BranchInfo) => {
    setActiveBranchState(branch);
    if (user) {
      localStorage.setItem(`ivalora_active_branch_${user.id}`, branch.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        if (!isMounted) return;
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          setTimeout(() => {
            if (isMounted) fetchUserData(sess.user.id);
          }, 0);
        } else {
          setStatus(null);
          setRole(null);
          setUserBranches([]);
          setActiveBranchState(null);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          await fetchUserData(sess.user.id);
        }
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
    await supabase.auth.signOut();
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, status, role, isLoading,
      activeBranch, userBranches, setActiveBranch,
      signOut, refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
