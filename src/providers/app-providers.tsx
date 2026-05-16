import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function ConvexAuthProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) {
    if (convexClient) {
      return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
    }

    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexAuthProvider>{children}</ConvexAuthProvider>
    </ClerkProvider>
  );
}
