import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const getDashboardLink = () => {
    if (hasRole("admin")) return "/admin";
    if (hasRole("affiliate")) return "/affiliate";
    return "/dashboard";
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>GhostPen</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Course</Link>
          <Link to="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(getDashboardLink())}>Dashboard</Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Log In</Button>
              <Button size="sm" onClick={() => navigate("/signup")}>Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-background p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/#modules" onClick={() => setOpen(false)} className="text-sm">Course</Link>
            <Link to="/#pricing" onClick={() => setOpen(false)} className="text-sm">Pricing</Link>
            <Link to="/#faq" onClick={() => setOpen(false)} className="text-sm">FAQ</Link>
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => { navigate(getDashboardLink()); setOpen(false); }}>Dashboard</Button>
                <Button variant="outline" size="sm" onClick={() => signOut()}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => { navigate("/login"); setOpen(false); }}>Log In</Button>
                <Button size="sm" onClick={() => { navigate("/signup"); setOpen(false); }}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
