import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MousePointerClick, DollarSign, TrendingUp, Copy, Share2, AlertCircle, CheckCircle2, XCircle, Loader2, Building2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "OPay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "VFD MFB", code: "566" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

const AffiliateDashboard = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [affiliate, setAffiliate] = useState<any>(null);
  const [clicks, setClicks] = useState(0);
  const [sales, setSales] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWithdrawal, setMinWithdrawal] = useState(20000);

  // Bank details state
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

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

    // Fetch min withdrawal setting
    const { data: settingData } = await supabase
      .rpc("get_platform_setting", { p_key: "min_withdrawal" });
    if (settingData) setMinWithdrawal(Number(settingData));
    setAffiliate(aff);
    setBankCode(aff.bank_code || "");
    setAccountNumber(aff.account_number || "");
    setAccountName(aff.account_name || "");

    const { data: clickData } = await supabase
      .rpc("get_affiliate_clicks", { p_affiliate_id: aff.id });
    setClicks(clickData?.length || 0);

    const { data: salesData } = await supabase
      .rpc("get_affiliate_sales", { p_affiliate_id: aff.id });
    setSales(salesData || []);
    const earnings = salesData?.reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0) || 0;
    setTotalEarnings(earnings);

    // Get all payouts (not just paid) to calculate available balance
    const { data: allPayouts } = await supabase
      .from("payouts")
      .select("*")
      .eq("affiliate_id", aff.id)
      .order("created_at", { ascending: false });
    
    setPayoutHistory(allPayouts || []);

    // Deduct completed + pending + processing payouts from available balance
    const deductedAmount = (allPayouts || [])
      .filter((p) => p.status !== "failed")
      .reduce((sum, p) => sum + p.amount, 0);
    setAvailableBalance(Math.max(0, earnings - deductedAmount));

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

  const verifyBankAccount = async () => {
    if (!bankCode || !accountNumber || accountNumber.length !== 10) return;
    setVerifyingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-bank-account", {
        body: { bank_code: bankCode, account_number: accountNumber },
      });
      if (error) throw error;
      if (data?.data?.account_name) {
        setAccountName(data.data.account_name);
        toast({ title: "Account verified!", description: data.data.account_name });
      } else {
        throw new Error("Could not verify account");
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingAccount(false);
    }
  };

  const saveBankDetails = async () => {
    if (!affiliate || !bankCode || !accountNumber || !accountName) return;
    setSavingBank(true);
    try {
      const bankName = NIGERIAN_BANKS.find((b) => b.code === bankCode)?.name || "";
      const { error } = await supabase
        .from("affiliates")
        .update({ bank_name: bankName, bank_code: bankCode, account_number: accountNumber, account_name: accountName, transfer_recipient_code: null })
        .eq("id", affiliate.id);
      if (error) throw error;
      setAffiliate({ ...affiliate, bank_name: bankName, bank_code: bankCode, account_number: accountNumber, account_name: accountName, transfer_recipient_code: null });
      toast({ title: "Bank details saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  const requestPayout = async () => {
    if (!affiliate || availableBalance < minWithdrawal) return;
    if (!affiliate.bank_code || !affiliate.account_number) {
      toast({ title: "Add bank details first", description: "Please save your bank details before requesting a payout.", variant: "destructive" });
      return;
    }

    // Check for existing pending/processing payouts
    const hasPending = payoutHistory.some((p) => p.status === "pending" || p.status === "approved");
    if (hasPending) {
      toast({ title: "Existing request pending", description: "You already have a pending withdrawal request.", variant: "destructive" });
      return;
    }

    setPayoutLoading(true);
    try {
      const { error: insertError } = await supabase
        .from("payouts")
        .insert({ affiliate_id: affiliate.id, amount: availableBalance, status: "pending" });
      if (insertError) throw insertError;

      toast({ title: "Withdrawal requested!", description: `₦${availableBalance.toLocaleString()} payout request submitted. Awaiting admin approval.` });

      // Notify admin
      const affiliateName = affiliate.account_name || affiliate.referral_code || "Affiliate";
      supabase.functions.invoke("send-notification", {
        body: { type: "payout_requested", data: { affiliateId: affiliate.id, amount: availableBalance, affiliateName } },
      }).catch(console.error);

      await fetchAffiliateData();
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    } finally {
      setPayoutLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusConfig = () => {
    if (!affiliate) return null;
    if (!affiliate.enabled) {
      return { icon: XCircle, variant: "destructive" as const, label: "Disabled", message: "Your affiliate account has been disabled. Please contact support.", color: "border-destructive/30 bg-destructive/5" };
    }
    if (!affiliate.approved) {
      return { icon: AlertCircle, variant: "secondary" as const, label: "Pending Approval", message: "Your affiliate account is pending approval. Commissions will be tracked and paid once approved.", color: "border-primary/30 bg-accent/50" };
    }
    return { icon: CheckCircle2, variant: "default" as const, label: "Active", message: "Your affiliate account is active. Share your referral link and start earning!", color: "border-green-500/30 bg-green-500/5" };
  };

  const status = getStatusConfig();
  const canWithdraw = availableBalance >= minWithdrawal && !payoutHistory.some((p) => p.status === "pending" || p.status === "approved");

  const getPayoutStatusBadge = (s: string) => {
    switch (s) {
      case "paid": return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Paid</Badge>;
      case "approved": return <Badge variant="secondary">Approved</Badge>;
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Affiliate Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Track your referrals and earnings (50% commission)</p>

        {/* Status Banner */}
        {status && (
          <Card className={`mt-4 ${status.color}`}>
            <CardContent className="flex items-start gap-3 py-4">
              <status.icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Account Status</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{status.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Clicks", value: clicks, icon: MousePointerClick },
            { label: "Total Sales", value: sales.length, icon: TrendingUp },
            { label: "Total Earnings", value: `₦${totalEarnings.toLocaleString()}`, icon: DollarSign },
            { label: "Available to Withdraw", value: `₦${availableBalance.toLocaleString()}`, icon: Wallet },
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

        {/* Withdrawal Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Withdraw Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <div>
                <p className="text-sm text-muted-foreground">Available to Withdraw</p>
                <p className="font-display text-3xl font-bold">₦{availableBalance.toLocaleString()}</p>
              </div>
              <Button
                onClick={requestPayout}
                disabled={!canWithdraw || payoutLoading}
                className="gap-2"
                size="lg"
              >
                {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                Request Withdrawal
              </Button>
            </div>
            {availableBalance < minWithdrawal && (
              <p className="text-sm text-muted-foreground">
                Minimum withdrawal amount is ₦{minWithdrawal.toLocaleString()}. You need ₦{(minWithdrawal - availableBalance).toLocaleString()} more.
              </p>
            )}
            {payoutHistory.some((p) => p.status === "pending" || p.status === "approved") && (
              <p className="text-sm text-amber-600">You have a pending withdrawal request being processed.</p>
            )}
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Add your bank details to receive payouts directly to your account.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Bank</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger><SelectValue placeholder="Select your bank" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0123456789"
                    maxLength={10}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={verifyBankAccount}
                    disabled={verifyingAccount || !bankCode || accountNumber.length !== 10}
                    className="shrink-0"
                  >
                    {verifyingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>
            </div>
            {accountName && (
              <div>
                <Label>Account Name</Label>
                <Input value={accountName} readOnly className="bg-muted" />
              </div>
            )}
            <Button onClick={saveBankDetails} disabled={savingBank || !bankCode || !accountNumber || !accountName} className="gap-2">
              {savingBank && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Bank Details
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-lg">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>₦{payout.amount.toLocaleString()}</TableCell>
                      <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{payout.transfer_reference || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                    <TableHead>Commission (50%)</TableHead>
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
