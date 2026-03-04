import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="border-t bg-muted/30">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            GhostPen
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">Master the art of ghostwriting and build a thriving freelance career.</p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Platform</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/#modules" className="hover:text-foreground">Course</Link>
            <Link to="/#pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/#faq" className="hover:text-foreground">FAQ</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Account</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Log In</Link>
            <Link to="/signup" className="hover:text-foreground">Sign Up</Link>
            <Link to="/signup?affiliate=true" className="hover:text-foreground">Become an Affiliate</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Legal</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GhostPen Academy. All rights reserved.
      </div>
    </div>
  </footer>
);
