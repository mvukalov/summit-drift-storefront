import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders the text it is given", () => {
    render(<Badge tone="accent">Sale</Badge>);

    expect(screen.getByText("Sale")).toBeInTheDocument();
  });
});
