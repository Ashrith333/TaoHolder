import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss: https:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // content/subnets/*.json is read with fs at runtime (fallback when Supabase is empty).
  outputFileTracingIncludes: { "/**": ["./content/**/*.json"] },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: csp }] }];
  },
  async redirects() {
    return [{ source: "/", destination: "/account", permanent: false }];
  },
};

export default nextConfig;
