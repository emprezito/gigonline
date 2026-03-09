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
  becomeAffiliate: () => Promise<void>;
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

    const syncSession = async (nextSession: Session | null, refreshRoles = true) => {
      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          if (refreshRoles) {
            const userRoles = await fetchRoles(nextSession.user.id);
            const wantsAffiliate = Boolean(nextSession.user.user_metadata?.wants_affiliate);

            if (wantsAffiliate && !userRoles.includes("affiliate")) {
              await ensureAffiliateProfile(
                nextSession.user.id,
                String(nextSession.user.user_metadata?.full_name ?? "")
              );
              await fetchRoles(nextSession.user.id);
            }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      const refreshRoles = event !== "TOKEN_REFRESHED";
      void syncSession(nextSession, refreshRoles);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void syncSession(currentSession, true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, isAffiliate = false) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: normalizedFullName, wants_affiliate: isAffiliate },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    // Send welcome / new user signup notification (fire-and-forget)
    if (data.user) {
      supabase.functions.invoke("send-notification", {
        body: {
          type: "new_user_signup",
          data: {
            userId: data.user.id,
            userName: normalizedFullName,
            userEmail: normalizedEmail,
          },
        },
      }).catch(console.error);
    }

    // Keep sign-up fast and finish affiliate setup in the background for auto-confirmed users.
    if (isAffiliate && data.user && data.session) {
      void (async () => {
        try {
          await ensureAffiliateProfile(data.user!.id, normalizedFullName);
          await fetchRoles(data.user!.id);
        } catch (setupError) {
          console.error("Affiliate setup error:", setupError);
        }
      })();
    }
  };

  const becomeAffiliate = async () => {
    if (!user) throw new Error("You must be logged in.");
    const fullName = String(user.user_metadata?.full_name ?? "");
    await ensureAffiliateProfile(user.id, fullName);
    await fetchRoles(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
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
    <AuthContext.Provider value={{ session, user, roles, loading, signUp, signIn, signOut, resetPassword, hasRole, becomeAffiliate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
