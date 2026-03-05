import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, isAffiliate?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const buildReferralCode = (fullName: string, userId: string) => {
    const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
    const fallback = `aff${userId.replace(/-/g, "").slice(0, 8)}`;
    return `${base || fallback}${Math.random().toString(36).slice(2, 8)}`;
  };

  const ensureAffiliateProfile = async (userId: string, fullName: string) => {
    const { data: existingAffiliate, error: affiliateLookupError } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (affiliateLookupError) throw affiliateLookupError;
    if (existingAffiliate && existingAffiliate.length > 0) return;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error: insertError } = await supabase.from("affiliates").insert({
        user_id: userId,
        referral_code: buildReferralCode(fullName, userId),
      });

      if (!insertError) return;
      if (insertError.code !== "23505") throw insertError;
    }

    throw new Error("Unable to create affiliate profile. Please try again.");
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const [{ data: roleRows, error: rolesError }, { data: affiliateRows, error: affiliateError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("affiliates").select("id").eq("user_id", userId).limit(1),
    ]);

    if (rolesError) throw rolesError;
    if (affiliateError) throw affiliateError;

    const nextRoles = new Set<AppRole>((roleRows ?? []).map((r) => r.role));
    if ((affiliateRows?.length ?? 0) > 0) nextRoles.add("affiliate");

    const roleList = Array.from(nextRoles);
    setRoles(roleList);
    return roleList;
  };

  useEffect(() => {
    let initialLoad = true;

    const syncSession = async (session: Session | null) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRoles = await fetchRoles(session.user.id);
          const wantsAffiliate = Boolean(session.user.user_metadata?.wants_affiliate);

          if (wantsAffiliate && !userRoles.includes("affiliate")) {
            await ensureAffiliateProfile(
              session.user.id,
              String(session.user.user_metadata?.full_name ?? "")
            );
            await fetchRoles(session.user.id);
          }
        } else {
          setRoles([]);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
      } finally {
        if (initialLoad) {
          initialLoad = false;
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncSession(session);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await syncSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, isAffiliate = false) => {
    const signUpPayload = {
      email,
      password,
      options: {
        data: { full_name: fullName, wants_affiliate: isAffiliate },
        emailRedirectTo: window.location.origin,
      },
    };

    const { data, error } = await supabase.auth.signUp(signUpPayload);

    if (error) {
      const isExistingAccount = error.message.toLowerCase().includes("already registered");
      if (!isAffiliate || !isExistingAccount) throw error;

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError || !loginData.user) throw loginError ?? error;

      await ensureAffiliateProfile(loginData.user.id, fullName || String(loginData.user.user_metadata?.full_name ?? ""));
      await fetchRoles(loginData.user.id);
      await supabase.auth.signOut();
      return;
    }

    if (!isAffiliate || !data.user) return;

    const looksLikeExistingUser = (data.user.identities?.length ?? 0) === 0;

    if (data.session) {
      await ensureAffiliateProfile(data.user.id, fullName);
      await fetchRoles(data.user.id);
      return;
    }

    if (looksLikeExistingUser) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError || !loginData.user) throw loginError ?? new Error("Unable to sign in to upgrade affiliate role.");

      await ensureAffiliateProfile(loginData.user.id, fullName || String(loginData.user.user_metadata?.full_name ?? ""));
      await fetchRoles(loginData.user.id);
      await supabase.auth.signOut();
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, roles, loading, signUp, signIn, signOut, resetPassword, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
