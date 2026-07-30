"use client";

import { useEffect } from "react";
import { completeEmailAuth, parseEmailAuthHash } from "@/lib/email-auth";
import { createEmailLandingClient } from "@/lib/supabase/email-flow-client";

export function EmailAuthRedirect() {
  useEffect(() => {
    const initial = parseEmailAuthHash(window.location.href);
    if (initial.kind === "none") return;
    if (initial.kind === "error") {
      const login = new URL("/login", window.location.origin);
      login.searchParams.set("error", "email_link");
      window.location.replace(login.toString());
      return;
    }

    let active = true;
    const client = createEmailLandingClient();
    void completeEmailAuth(
      window.location.href,
      (tokens) => client.auth.setSession(tokens),
    ).then((result) => {
        if (!active) return;
        if (result.kind === "none") return;
        if (result.kind === "error") {
          const login = new URL("/login", window.location.origin);
          login.searchParams.set("error", "email_link");
          window.location.replace(login.toString());
          return;
        }
        window.location.replace(result.destination);
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
