import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MousePointerClick, DollarSign, TrendingUp, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AffiliateDashboard = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [affiliate, setAffiliate] = useState<any>(null);
  const [clicks, setClicks] = useState(0);
  const [sales, setSales] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole("affiliate"))) {
      navigate("/dashboard");
      return;
    }
    if (user) fetchAffiliateData();
  }, [user, authLoading]);

  const fetchAffiliateData = async () => {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (!aff) { setLoading(false); return; }
    setAffiliate(aff);

    const { count } = await supabase
      .from("referral_clicks")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", aff.id);
    setClicks(count || 0);

    const { data: salesData } = await supabase
      .from("sales")
      .select("*")
      .eq("affiliate_id", aff.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    setSales(salesData || []);
    setTotalEarnings(salesData?.reduce((sum, s) => sum + (s.commission_amount || 0), 0) || 0);

    const { data: payouts } = await supabase
      .from("payouts")
      .select("amount")
      .eq("affiliate_id", aff.id)
      .eq("status", "paid");
    const paidAmount = payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
    setPendingPayouts(totalEarnings - paidAmount);

    setLoading(false);
  };

  const copyLink = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${affiliate.referral_code}`);
    toast({ title: "Link copied!" });
  };

  const shareOnTwitter = () => {
    const url = encodeURIComponent(`${window.location.origin}/?ref=${affiliate?.referral_code}`);
    window.open(`https://twitter.com/intent/tweet?text=Master%20ghostwriting%20with%20this%20amazing%20course!&url=${url}`, "_blank");
  };

  const shareOnWhatsApp = () => {
    const url = encodeURIComponent(`${window.location.origin}/?ref=${affiliate?.referral_code}`);
    window.open(`https://wa.me/?text=Check%20out%20this%20ghostwriting%20course!%20${url}`, "_blank");
  };

  const requestPayout = async () => {
    if (!affiliate || pendingPayouts <= 0) return;
    await supabase.from("payouts").insert({
      affiliate_id: affiliate.id,
      amount: pendingPayouts,
    });
    toast({ title: "Payout requested", description: "Your payout request has been submitted for review." });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Affiliate Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Track your referrals and earnings</p>

        {!affiliate?.approved && (
          <Card className="mt-4 border-primary/20 bg-accent/50">
            <CardContent className="py-4">
              <p className="text-sm">Your affiliate account is pending approval. You'll be notified once approved.</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Clicks", value: clicks, icon: MousePointerClick },
            { label: "Total Sales", value: sales.length, icon: TrendingUp },
            { label: "Total Earnings", value: `₦${totalEarnings.toLocaleString()}`, icon: DollarSign },
            { label: "Pending Payout", value: `₦${pendingPayouts.toLocaleString()}`, icon: DollarSign },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <stat.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Referral Link */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/?ref=${affiliate?.referral_code || ""}`} className="font-mono text-sm" />
              <Button variant="outline" onClick={copyLink} className="gap-2 shrink-0">
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shareOnTwitter} className="gap-2">
                <Share2 className="h-4 w-4" /> Twitter
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnWhatsApp} className="gap-2">
                <Share2 className="h-4 w-4" /> WhatsApp
              </Button>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Marketing Copy</p>
              <p className="mt-2 text-sm text-muted-foreground">
                "Want to build a 6-figure ghostwriting career? This course taught me everything I needed to know. Enroll now and transform your writing into a business!"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payout */}
        {pendingPayouts > 0 && (
          <div className="mt-4">
            <Button onClick={requestPayout} className="gap-2">
              <DollarSign className="h-4 w-4" />
              Request Payout (₦{pendingPayouts.toLocaleString()})
            </Button>
          </div>
        )}

        {/* Sales History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-lg">Sales History</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet. Share your referral link to start earning!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>₦{sale.amount.toLocaleString()}</TableCell>
                      <TableCell>₦{(sale.commission_amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AffiliateDashboard;
