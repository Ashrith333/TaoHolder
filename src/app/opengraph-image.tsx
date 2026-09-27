import { ImageResponse } from "next/og";
import { BrandImage } from "@/components/brand/BrandImage";
import { brandFonts } from "@/components/brand/fonts";

export const alt = "taoholder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview (X, Telegram, Discord…): wordmark + tagline. */
export default async function OpengraphImage() {
  return new ImageResponse(<BrandImage size={150} sub="Stake or invest in subnets. Sell back. One confirm." />, { ...size, fonts: await brandFonts() });
}
