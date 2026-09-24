import type { Metadata } from "next";
import { CartDrawer } from "@/components/organisms/CartDrawer/CartDrawer";
import { CartProvider } from "@/components/organisms/CartProvider/CartProvider";
import { Footer } from "@/components/organisms/Footer/Footer";
import { Header } from "@/components/organisms/Header/Header";
import { getCartFromCookie } from "@/lib/cart/fetchers";
import { getMainMenu } from "@/lib/catalog/fetchers";
import { ApolloWrapper } from "@/lib/graphql/ApolloWrapper";
import { SITE_URL } from "@/lib/seo/site";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  // Relative canonical URLs (collection pages, §5.5) resolve against this.
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Summit Drift Outfitters",
    default: "Summit Drift Outfitters",
  },
  description:
    "Outdoor apparel and gear for hikers and commuters: protection shells, base layers, trail bottoms and field gear.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Both start together; the cart is a `no-store` read while the menu is cached.
  // Reading the cart cookie here is what makes `/` render dynamically (docs/cart.md).
  const [menuItems, cart] = await Promise.all([getMainMenu(), getCartFromCookie()]);

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ApolloWrapper>
          <CartProvider initialCart={cart}>
            <Header items={menuItems} />
            {/* tabIndex -1: the skip link's target must be focusable to receive focus. */}
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
            <Footer items={menuItems} />
            <CartDrawer />
          </CartProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
