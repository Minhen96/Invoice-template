// Convex verifies session JWTs issued by this same deployment (Convex Auth).
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
