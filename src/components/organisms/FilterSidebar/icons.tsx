import type { ReactNode } from "react";

// Decorative icons for the filter drawer's buttons; the buttons carry the accessible names.
// Local to this organism, like the header's own icons.

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function FilterIcon() {
  return (
    <Icon>
      <path d="M4 6h16L14 13v5l-4 2v-7L4 6Z" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}
