import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { ConvexProvider, ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function useClerkConvexAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return {
    isLoading: !isLoaded,
    isAuthenticated: Boolean(isSignedIn),
    fetchAccessToken: () => getToken({ template: "convex" }),
  };
}

function ConvexAuthProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useClerkConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
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
