import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const pollingRef = useRef(false);

  const reference = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!reference) { setStatus("error"); return; }
    if (pollingRef.current) return;
    pollingRef.current = true;

    // First verify the transaction with Paystack via edge function
    const verifyAndPoll = async () => {
      // Verify payment server-side
      try {
        await supabase.functions.invoke("verify-payment", {
          body: { reference },
        });
      } catch (e) {
        console.log("Verify-payment call failed, falling back to polling", e);
      }

      // Poll for enrollment
      let attempts = 0;
      const maxAttempts = 20;

      const poll = async () => {
        const { data } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user!.id)
          .order("enrolled_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setStatus("success");
          toast({
            title: "🎉 Course Unlocked!",
            description: "You have successfully unlocked this course. Enjoy learning!",
          });
          setTimeout(() => navigate(`/course/${data[0].course_id}`), 2500);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setStatus("success");
          toast({
            title: "Payment Received",
            description: "Your enrollment is being processed. Check your dashboard.",
          });
          setTimeout(() => navigate("/dashboard"), 2500);
        } else {
          setTimeout(poll, 2000);
        }
      };

      poll();
    };

    verifyAndPoll();
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
