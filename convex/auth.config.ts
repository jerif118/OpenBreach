const domain = process.env.CLERK_JWT_ISSUER_DOMAIN?.replace("https://", "").replace("http://", "");
console.log("Clerk auth domain:", domain);

export default {
  providers: [
    {
      domain: domain,
      applicationID: "convex",
    },
  ],
};
