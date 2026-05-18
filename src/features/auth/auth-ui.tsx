import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

const AUTH_NOTICE_STORAGE_KEY = "openbreach:auth-notice";
const MISSING_ACCOUNT_NOTICE = "missing-account";

const clerkAppearance = {
  elements: {
    card: "bg-[#242429] border border-primary/10 shadow-none",
    footer: "bg-[#2b2b30]",
    footerActionLink: "text-[#00e639] hover:text-[#48ff73]",
    formButtonPrimary:
      "bg-[#f7f7f2] text-[#101010] hover:bg-[#d9ffe0] font-mono uppercase",
    formFieldInput:
      "bg-[#1b1b1f] border-primary/20 text-[#f4f4f0] font-mono",
    formFieldLabel: "text-[#f4f4f0] font-mono",
    headerSubtitle: "text-[#b9cacb] font-mono",
    headerTitle: "text-[#f4f4f0] font-display",
    rootBox: "w-full",
    socialButtonsBlockButton:
      "bg-[#1b1b1f] border-primary/20 text-[#f4f4f0] hover:bg-primary/10 font-mono",
  },
  variables: {
    borderRadius: "8px",
    colorBackground: "#242429",
    colorDanger: "#ff5f6d",
    colorInputBackground: "#1b1b1f",
    colorInputText: "#f4f4f0",
    colorPrimary: "#00e639",
    colorText: "#f4f4f0",
    colorTextSecondary: "#b9cacb",
    fontFamily: "JetBrains Mono, monospace",
  },
};

function rememberMissingAccountNotice() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    AUTH_NOTICE_STORAGE_KEY,
    MISSING_ACCOUNT_NOTICE,
  );
}

function consumeAuthNotice() {
  if (typeof window === "undefined") {
    return null;
  }

  const notice = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  return notice;
}

function isMissingAccountMessage(text: string) {
  const normalized = text.toLowerCase();
  return (
    (normalized.includes("external account") &&
      normalized.includes("not found")) ||
    normalized.includes("account was not found") ||
    (normalized.includes("cuenta") &&
      (normalized.includes("no existe") ||
        normalized.includes("no encontrada")))
  );
}

function MissingAccountRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined" || !document.body) {
      return;
    }

    let hasRedirected = false;
    const redirectIfNeeded = () => {
      if (hasRedirected || !isMissingAccountMessage(document.body.innerText)) {
        return;
      }

      hasRedirected = true;
      rememberMissingAccountNotice();
      void navigate({ replace: true, to: "/sign-up" });
    };

    const observer = new MutationObserver(redirectIfNeeded);
    observer.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    redirectIfNeeded();

    return () => observer.disconnect();
  }, [navigate]);

  return null;
}

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="pixel-corner border-primary/20 w-full max-w-md border bg-[#131313] p-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-primary text-2xl tracking-[0.2em] uppercase">
            OPEN BREACH
          </h1>
          <p className="mt-2 font-mono text-xs text-[#b9cacb]">
            Security Validation Platform
          </p>
        </div>
        {children}
        <div className="border-primary/10 mt-6 border-t pt-6">{footer}</div>
      </div>
    </div>
  );
}

export function OpenBreachSignIn() {
  return (
    <>
      <MissingAccountRedirect />
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl="/guardian"
        forceRedirectUrl="/guardian"
        signUpUrl="/sign-up"
        transferable
        withSignUp
      />
    </>
  );
}

export function OpenBreachSignUp() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setNotice(consumeAuthNotice());
  }, []);

  return (
    <div className="space-y-4">
      {notice === MISSING_ACCOUNT_NOTICE ? (
        <div className="border-[#00e639]/40 bg-[#00e639]/10 px-4 py-3 font-mono text-xs leading-5 text-[#d8ffe0]">
          No encontramos una cuenta para ese acceso. Crea tu cuenta para
          continuar.
        </div>
      ) : null}
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl="/guardian"
        forceRedirectUrl="/guardian"
        signInUrl="/auth"
      />
    </div>
  );
}
