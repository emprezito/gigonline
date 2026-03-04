import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, DollarSign, CheckCircle, Star, Play, ArrowRight, Zap, Target, TrendingUp } from "lucide-react";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const modules = [
  {
    title: "Module 1: Foundations",
    lessons: ["Introduction to Ghostwriting", "Finding Clients", "Setting Up Your Portfolio", "Client Communication Mastery"],
  },
  {
    title: "Module 2: The Craft",
    lessons: ["Writing High-Converting Content", "Pricing Your Services", "Voice Matching Techniques", "Editing & Revision Workflow"],
  },
  {
    title: "Module 3: Scaling Up",
    lessons: ["Getting High-Paying Clients", "Scaling Your Ghostwriting Business", "Building a Team", "Passive Income Streams"],
  },
];

const testimonials = [
  { name: "Sarah K.", role: "Freelance Writer", text: "This course transformed my freelance career. I went from $500 to $5,000/month in 3 months.", avatar: "SK" },
  { name: "James O.", role: "Content Strategist", text: "The modules on client acquisition alone were worth 10x the price. Incredibly actionable.", avatar: "JO" },
  { name: "Amara D.", role: "Ghostwriter", text: "I landed my first $2,000 ghostwriting gig within 2 weeks of completing Module 2.", avatar: "AD" },
];

const faqs = [
  { q: "Who is this course for?", a: "Anyone who wants to build a profitable ghostwriting career — whether you're a complete beginner or an experienced writer looking to scale." },
  { q: "How long do I have access?", a: "Lifetime access. Once you enroll, you can revisit the materials anytime, including future updates." },
  { q: "Is there a money-back guarantee?", a: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund you in full." },
  { q: "Can I become an affiliate?", a: "Absolutely! Sign up as an affiliate and earn 30% commission on every sale you refer. We provide marketing materials and tracking." },
  { q: "What format are the lessons?", a: "A mix of video lessons, written guides, and downloadable templates/resources you can use with clients." },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur">
              <Zap className="h-4 w-4 text-primary" />
              <span>Join 2,000+ students already enrolled</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Master the Art of{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Ghostwriting
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Learn how to build a 6-figure ghostwriting business from scratch. Get clients, deliver exceptional work, and scale your income.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 text-base" onClick={() => navigate("/signup")}>
                Enroll Now — ₦49,999
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2 text-base" onClick={() => navigate("/signup?affiliate=true")}>
                Become an Affiliate
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">What You'll Learn</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to become a top-tier ghostwriter</p>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Target, title: "Find Premium Clients", desc: "Learn proven strategies to attract high-paying clients consistently." },
              { icon: BookOpen, title: "Write Compelling Content", desc: "Master voice-matching and high-converting writing techniques." },
              { icon: TrendingUp, title: "Scale to 6 Figures", desc: "Build systems to grow from freelancer to business owner." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} transition={{ delay: i * 0.15 }}>
                <Card className="h-full border-0 bg-background shadow-md transition-shadow hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                      <item.icon className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Preview */}
      <section id="modules" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Course Modules</h2>
            <p className="mt-3 text-muted-foreground">12 lessons across 3 comprehensive modules</p>
          </motion.div>
          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {modules.map((mod, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} transition={{ delay: i * 0.1 }}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 bg-accent/50 p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </div>
                      <h3 className="font-display font-semibold">{mod.title}</h3>
                    </div>
                    <div className="p-4">
                      {mod.lessons.map((lesson, j) => (
                        <div key={j} className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
                          <Play className="h-3.5 w-3.5 text-primary" />
                          {lesson}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">What Our Students Say</h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} transition={{ delay: i * 0.15 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="mb-3 flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">"{t.text}"</p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-3xl font-bold text-primary-foreground">
              GP
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Meet Your Instructor</h2>
              <p className="mt-3 text-muted-foreground">
                A seasoned ghostwriter with 10+ years of experience, having written for Fortune 500 executives, bestselling authors, and top-tier publications. 
                This course distills a decade of real-world expertise into actionable lessons you can apply immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Simple Pricing</h2>
            <p className="mt-3 text-muted-foreground">One course. Lifetime access. No hidden fees.</p>
          </motion.div>
          <motion.div className="mx-auto mt-12 max-w-md" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <Card className="relative overflow-hidden border-primary/20 shadow-lg">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
              <CardContent className="p-8 text-center">
                <h3 className="font-display text-xl font-semibold">Ghostwriting Mastery</h3>
                <div className="mt-4">
                  <span className="font-display text-5xl font-bold">₦49,999</span>
                  <span className="text-muted-foreground"> / one-time</span>
                </div>
                <ul className="mt-6 space-y-3 text-left text-sm">
                  {["12 in-depth video lessons", "Downloadable templates & resources", "Lifetime access + updates", "Private community access", "Certificate of completion", "30-day money-back guarantee"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-8 w-full gap-2" onClick={() => navigate("/signup")}>
                  Enroll Now <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          </motion.div>
          <div className="mx-auto mt-12 max-w-2xl">
            <Accordion type="single" collapsible>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-display">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Affiliate CTA */}
      <section className="border-t bg-gradient-to-br from-primary/10 via-accent/30 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <DollarSign className="h-4 w-4" />
              Affiliate Program
            </div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Earn While You Share</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join our affiliate program and earn 30% commission on every sale. Get your unique referral link, marketing materials, and real-time tracking.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" onClick={() => navigate("/signup?affiliate=true")}>
                <Users className="h-4 w-4" />
                Become an Affiliate
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
