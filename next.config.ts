import type { NextConfig } from "next";

// 'wasm-unsafe-eval' allows WebAssembly only (the Polkadot crypto library needs it to build and
// sign transactions); JavaScript eval stays blocked. Dev only: React uses eval() for debugging
// and Next's hot reload uses ws://localhost.
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' https://*.supabase.co wss: https:${dev ? " ws:" : ""}`,
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
