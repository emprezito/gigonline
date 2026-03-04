import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";

export const ReferralTracker = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      Cookies.set("referral_code", ref, { expires: 30 });
    }
  }, [searchParams]);

  return null;
};
