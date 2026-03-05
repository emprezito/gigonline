import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const HashScrollHandler = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const elementId = hash.replace("#", "");
    const timer = window.setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  return null;
};
