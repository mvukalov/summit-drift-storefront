import type { Metadata } from "next";
import { Footer } from "@/components/organisms/Footer/Footer";
import { Header } from "@/components/organisms/Header/Header";
import { getMainMenu } from "@/lib/catalog/fetchers";
import { ApolloWrapper } from "@/lib/graphql/ApolloWrapper";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: {
    template: "%s | Summit Drift Outfitters",
    default: "Summit Drift Outfitters",
  },
  description:
    "Outdoor apparel and gear for hikers and commuters: protection shells, base layers, trail bottoms and field gear.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Fetched once here and shared by the header and footer navigation.
  const menuItems = await getMainMenu();

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ApolloWrapper>
          <Header items={menuItems} />
          {/* tabIndex -1: the skip link's target must be focusable to receive focus. */}
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer items={menuItems} />
        </ApolloWrapper>
      </body>
    </html>
  );
}
