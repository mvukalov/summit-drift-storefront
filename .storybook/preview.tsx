import type { Preview } from "@storybook/nextjs-vite";
import { fontVariables } from "../src/styles/fonts";
import "../src/styles/globals.scss";

// The app puts the next/font variable classes on <html> (see src/app/layout.tsx);
// mirror that so stories and docs pages resolve the same font tokens.
document.documentElement.classList.add(...fontVariables.split(" "));

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Report violations in the UI without failing; CI enforcement comes with the E2E/axe feature.
      test: "todo",
    },
  },
};

export default preview;
