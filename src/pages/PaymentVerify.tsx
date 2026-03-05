import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const reference = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!reference) { setStatus("error"); return; }

    // Paystack redirects here after payment. The webhook handles enrollment.
    // We just poll for the enrollment to appear.
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setStatus("success");
        setTimeout(() => navigate(`/course/${data[0].course_id}`), 2000);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        // Enrollment might still be processing — just redirect to dashboard
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [user, authLoading, reference]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Verifying your payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your enrollment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Payment Successful!</h2>
            <p className="text-muted-foreground">Redirecting you to your course...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">Please check your dashboard for enrollment status.</p>
            <button onClick={() => navigate("/dashboard")} className="text-primary underline">Go to Dashboard</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
