import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Star, Play, ArrowRight, Zap, Target, TrendingUp, Flame, Crown, Moon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

const faqs = [
  { q: "Who is this course for?", a: "Anyone who wants to earn money writing novels on platforms like GoodNovel, LetterLux, Novellair, and more — whether you're a complete beginner or an experienced writer looking to break into web novel ghostwriting." },
  { q: "Do I need writing experience?", a: "Not at all! The course starts from the basics and walks you through everything — from understanding popular tropes to writing your first chapter. Many of our successful students started with zero experience." },
  { q: "What genres does this course cover?", a: "We focus on the highest-paying web novel genres: Dark Romance, Billionaire Romance, Werewolf/Supernatural, Mafia, and more. You'll learn the tropes, structures, and hooks that readers on these platforms love." },
  { q: "How long do I have access?", a: "Lifetime access. Once you enroll, you can revisit the materials anytime, including future updates." },
  { q: "Is there a money-back guarantee?", a: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund you in full." },
  { q: "What format are the lessons?", a: "A mix of video lessons, written guides, and downloadable templates/resources you can use immediately." },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<{ id: string; image_url: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from("testimonial_screenshots")
        .select("id, image_url")
        .order("sort_order");
      setTestimonials(data || []);
    };
    fetchTestimonials();
  }, []);

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
              <span>Write for GoodNovel, LetterLux & more</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Get Paid to Write{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Web Novels
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Learn how to ghostwrite Dark Romance, Billionaire, Werewolf & Supernatural novels for platforms like GoodNovel, LetterLux, Novellair — and start earning ₦100k+ monthly.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 text-base" onClick={() => navigate("/signup")}>
                Enroll Now — ₦20,000
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Genres */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Write What Readers Crave</h2>
            <p className="mt-3 text-muted-foreground">Master the most profitable genres on web novel platforms</p>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Flame, title: "Dark Romance & Mafia", desc: "Rejected mates, contract marriages, forbidden love, mafia bosses — write the tropes that keep readers binge-reading all night." },
              { icon: Crown, title: "Billionaire Romance", desc: "CEO romances, secret babies, sold brides — learn how to craft irresistible billionaire stories that dominate the charts." },
              { icon: Moon, title: "Werewolf & Supernatural", desc: "Alpha mates, vampire kings, second-chance bonds — tap into the massive werewolf and supernatural fanbase." },
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

      {/* What You'll Learn */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">What You'll Learn</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to start earning as a web novel ghostwriter</p>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Target, title: "Find Ghostwriting Gigs", desc: "Learn exactly how to land writing contracts on GoodNovel, LetterLux, Novellair, and other platforms." },
              { icon: BookOpen, title: "Write Addictive Stories", desc: "Master cliffhangers, tropes, pacing, and hooks that keep readers coming back for more chapters." },
              { icon: TrendingUp, title: "Scale to ₦100k+/Month", desc: "Build a system to write consistently, manage multiple projects, and grow your ghostwriting income." },
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
      <section id="modules" className="border-t bg-muted/30 py-20">
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

      {/* Testimonials - Screenshot Gallery */}
      {testimonials.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <h2 className="font-display text-3xl font-bold md:text-4xl">What Our Students Say</h2>
              <p className="mt-3 text-muted-foreground">Real results from real students</p>
            </motion.div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.div key={t.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} transition={{ delay: i * 0.1 }}>
                  <Card
                    className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                    onClick={() => setSelectedImage(t.image_url)}
                  >
                    <img
                      src={t.image_url}
                      alt={`Student testimonial ${i + 1}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Lightbox */}
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-3xl p-2">
              {selectedImage && (
                <img src={selectedImage} alt="Testimonial" className="w-full h-auto rounded-lg" />
              )}
            </DialogContent>
          </Dialog>
        </section>
      )}

      {/* Instructor */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-3xl font-bold text-primary-foreground">
              GP
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Meet Your Instructor</h2>
              <p className="mt-3 text-muted-foreground">
                A professional ghostwriter who has written 50+ novels across Dark Romance, Billionaire, and Werewolf genres for top web novel platforms. 
                This course distills real-world experience into actionable lessons so you can start earning from your writing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
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
                  <span className="font-display text-5xl font-bold">₦20,000</span>
                  <span className="text-muted-foreground"> / one-time</span>
                </div>
                <ul className="mt-6 space-y-3 text-left text-sm">
                  {[
                    "12 in-depth video lessons",
                    "Learn Dark Romance, Billionaire & Werewolf genres",
                    "Platform-specific strategies for GoodNovel & LetterLux",
                    "Downloadable templates & resources",
                    "Lifetime access + updates",
                    "Certificate of completion",
                    "30-day money-back guarantee",
                  ].map((item, i) => (
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
      <section id="faq" className="border-t bg-muted/30 py-20">
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

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to Start Earning as a Ghostwriter?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join hundreds of students already writing and earning on web novel platforms. Your first novel could be just weeks away.
            </p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 text-base" onClick={() => navigate("/signup")}>
                Enroll Now — ₦20,000
                <ArrowRight className="h-4 w-4" />
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
