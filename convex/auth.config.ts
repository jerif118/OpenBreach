const isClerkConfigured =
  process.env.CLERK_JWT_ISSUER_DOMAIN &&
  process.env.CLERK_JWT_ISSUER_DOMAIN.length > 0;

export default isClerkConfigured
  ? {
      providers: [
        {
          domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
          applicationID: "convex",
        },
      ],
    }
  : {
      providers: [],
      trialMode: true,
    };
