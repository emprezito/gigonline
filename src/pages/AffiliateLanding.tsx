import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Link2, Share2, ShoppingCart, Users, Loader2, Star, TrendingUp, Wallet, BookOpen } from "lucide-react";

const COURSE_PRICE = 49999;

const tiers = [
  { name: "Starter", minSales: 0, rate: 30, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { name: "Silver", minSales: 6, rate: 35, color: "bg-gray-400/10 text-gray-500 border-gray-400/20" },
  { name: "Gold", minSales: 16, rate: 40, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { name: "Diamond", minSales: 31, rate: 50, color: "bg-primary/10 text-primary border-primary/20" },
];

const getTier = (sales: number) => {
  if (sales >= 31) return tiers[3];
  if (sales >= 16) return tiers[2];
  if (sales >= 6) return tiers[1];
  return tiers[0];
};

const faqs = [
  { q: "When do I get paid?", a: "Payouts are processed weekly every Friday. You can request a withdrawal once your balance exceeds the minimum threshold set by the platform." },
  { q: "How is tracking handled?", a: "When someone clicks your unique referral link, a cookie is stored in their browser for 30 days. If they purchase within that window, the sale is attributed to you." },
  { q: "What happens if the buyer requests a refund?", a: "If a refund is issued, the associated commission is reversed from your balance. Only completed, non-refunded sales count toward your earnings." },
  { q: "What promotion channels are allowed?", a: "You can promote via social media, WhatsApp, Telegram, your blog, YouTube, or any platform where you have an audience. Spam and misleading advertising are strictly prohibited." },
  { q: "Can I be both a student and an affiliate?", a: "Yes! In fact, being an enrolled student is a requirement. You must have completed at least 3 modules to qualify for the affiliate program." },
  { q: "Is there a limit to how much I can earn?", a: "No cap! The more sales you drive, the higher your tier and commission rate. Top affiliates earn six figures monthly." },
];

export default function AffiliateLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [salesPerMonth, setSalesPerMonth] = useState([10]);
  const [form, setForm] = useState({ full_name: "", email: "", whatsapp_number: "", promotion_plan: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const projected = useMemo(() => {
    const s = salesPerMonth[0];
    const tier = getTier(s);
    return { monthly: s * COURSE_PRICE * (tier.rate / 100), tier };
  }, [salesPerMonth]);

  const handleSubmit = async () => {
    if (!user) { navigate("/signup"); return; }
    if (!form.full_name || !form.email || !form.whatsapp_number || !form.promotion_plan) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("affiliate_applications").insert({
        ...form, user_id: user.id,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll review it within 24-48 hours." });
    } catch {
      toast({ title: "Submission failed. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://gigonline.lovable.app?ref=YOURCODE");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-[var(--gradient-dark)] opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(263,70%,50%,0.15),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 px-4 py-1.5">Exclusive Affiliate Program</Badge>
          <h1 className="font-display text-4xl font-bold text-white md:text-6xl leading-tight">
            Earn Up to <span className="text-primary">50% Commission</span><br />On Every Sale
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Share GhostPen with aspiring ghostwriters and earn generous commissions. No inventory, no customer support — just share your link and get paid.
          </p>
          <Button size="lg" className="mt-8 px-8 text-lg" onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
            Apply to Become an Affiliate
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { icon: Link2, title: "Get Your Link", desc: "Sign up and receive a unique referral link instantly" },
              { icon: Share2, title: "Share It", desc: "Promote on WhatsApp, social media, YouTube, or your blog" },
              { icon: ShoppingCart, title: "Someone Buys", desc: "When they purchase through your link, the sale is tracked" },
              { icon: Wallet, title: "You Get Paid", desc: "Earn commission deposited directly to your bank account" },
            ].map((step, i) => (
              <Card key={i} className="text-center border-border/50">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">STEP {i + 1}</div>
                  <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Commission Tiers</h2>
          <p className="text-center text-muted-foreground mb-12">The more you sell, the more you earn per sale</p>
          <div className="grid gap-6 md:grid-cols-4">
            {tiers.map((tier) => (
              <Card key={tier.name} className={`border-2 ${tier.color} transition-transform hover:scale-105`}>
                <CardContent className="pt-8 pb-6 text-center">
                  <Star className="mx-auto mb-3 h-8 w-8" />
                  <h3 className="font-display text-xl font-bold">{tier.name}</h3>
                  <p className="font-display text-4xl font-bold mt-2">{tier.rate}%</p>
                  <p className="text-sm mt-2 opacity-80">
                    {tier.minSales === 0 ? "0–5 sales/month" : tier.minSales === 6 ? "6–15 sales/month" : tier.minSales === 16 ? "16–30 sales/month" : "31+ sales/month"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Earnings Calculator</h2>
          <Card>
            <CardContent className="p-8">
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Sales per month</span>
                    <span className="font-display text-2xl font-bold">{salesPerMonth[0]}</span>
                  </div>
                  <Slider value={salesPerMonth} onValueChange={setSalesPerMonth} min={1} max={50} step={1} className="w-full" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>1</span><span>50</span>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Projected Monthly Earnings</p>
                  <p className="font-display text-5xl font-bold text-primary mt-2">₦{projected.monthly.toLocaleString()}</p>
                  <Badge className={`mt-3 ${projected.tier.color}`}>{projected.tier.name} Tier · {projected.tier.rate}% Commission</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Requirements</h2>
          <div className="space-y-4">
            {[
              { icon: BookOpen, text: "Must be an enrolled GhostPen student" },
              { icon: TrendingUp, text: "Completed at least 3 course modules" },
              { icon: Wallet, text: "Active Nigerian bank account for payouts" },
              { icon: Users, text: "Agree to our affiliate terms and conditions" },
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <req.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium">{req.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20">
        <div className="container mx-auto px-4 max-w-lg">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Apply Now</h2>
          <p className="text-center text-muted-foreground mb-8">Fill out the form below and we'll review your application within 24-48 hours.</p>
          {submitted ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-display text-xl font-bold">Application Submitted!</h3>
                <p className="mt-2 text-muted-foreground">We'll review your application and get back to you soon.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div>
                  <label className="text-sm font-medium">WhatsApp Number</label>
                  <Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+234..." />
                </div>
                <div>
                  <label className="text-sm font-medium">How do you plan to promote?</label>
                  <Textarea value={form.promotion_plan} onChange={(e) => setForm({ ...form, promotion_plan: e.target.value })} placeholder="Tell us about your audience and promotion strategy..." rows={4} />
                </div>
                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {user ? "Submit Application" : "Sign Up to Apply"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Referral Link Preview */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <h2 className="font-display text-2xl font-bold mb-4">Your Referral Link Will Look Like This</h2>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-4">
            <code className="flex-1 truncate text-sm text-muted-foreground">https://gigonline.lovable.app?ref=<span className="text-primary font-bold">YOURCODE</span></code>
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">You'll receive your unique code after your application is approved.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
