import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ProfileSettings = () => {
  const { user, hasRole, becomeAffiliate } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  if (profile && !fullName && !bio) {
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, bio }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const changePassword = async () => {
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated!" });
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  const handleBecomeAffiliate = async () => {
    setAffiliateLoading(true);
    try {
      await becomeAffiliate();
      toast({ title: "You're now an affiliate!", description: "Visit your Affiliate Dashboard to get your referral link." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAffiliateLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Profile Settings</h1>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Email</Label><Input disabled value={user?.email || ""} /></div>
            <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {!hasRole("affiliate") && (
          <Card className="mt-6 border-primary/30">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Become an Affiliate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Earn commissions by sharing your unique referral link. When someone enrolls through your link, you get paid!
              </p>
              <Button onClick={handleBecomeAffiliate} disabled={affiliateLoading} className="gap-2">
                {affiliateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join the Affiliate Program
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} /></div>
            <Button onClick={changePassword} disabled={changingPw || newPassword.length < 6}>
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ProfileSettings;
