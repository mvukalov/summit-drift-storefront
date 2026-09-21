import type { Metadata } from "next";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: {
    template: "%s | Summit Drift Outfitters",
    default: "Summit Drift Outfitters",
  },
  description:
    "Outdoor apparel and gear for hikers and commuters: protection shells, base layers, trail bottoms and field gear.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
