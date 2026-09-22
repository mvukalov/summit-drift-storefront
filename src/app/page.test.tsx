import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/lib/catalog/fetchers", () => ({
  getCollections: vi.fn(async () => [
    {
      handle: "summit-protection-shells",
      title: "Summit Protection Shells",
      description: "",
      image: null,
    },
    {
      handle: "trail-foundation-layers",
      title: "Trail Foundation Layers",
      description: "",
      image: null,
    },
  ]),
}));

describe("Home page", () => {
  it("renders the store name as the level-1 heading", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { level: 1, name: "Summit Drift Outfitters" }),
    ).toBeInTheDocument();
  });

  it("lists the collection titles", async () => {
    render(await Home());

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Summit Protection Shells",
      "Trail Foundation Layers",
    ]);
  });
});
