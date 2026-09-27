import { ImageResponse } from "next/og";
import { brandFonts } from "@/components/brand/fonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: "tao" in white on black, matching the favicon. */
export default async function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontFamily: "Inter", fontSize: 72, fontWeight: 800, letterSpacing: -3 }}>
      tao
    </div>,
    { ...size, fonts: await brandFonts() },
  );
}
