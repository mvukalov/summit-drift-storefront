import { IBM_Plex_Sans, Libre_Baskerville } from "next/font/google";

// Both are variable fonts, so no weight list is needed. The CSS variables they
// declare are consumed by `--font-serif` / `--font-sans` in tokens.scss.
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre-baskerville",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

/** Class names that declare the font CSS variables; apply to the root element. */
export const fontVariables = `${libreBaskerville.variable} ${ibmPlexSans.variable}`;
