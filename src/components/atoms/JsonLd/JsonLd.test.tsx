import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";

function renderScript(data: Record<string, unknown>): HTMLScriptElement {
  const { container } = render(<JsonLd data={data} />);
  const script = container.querySelector("script");
  if (!script) {
    throw new Error("JsonLd rendered no script element");
  }
  return script;
}

describe("JsonLd", () => {
  it("renders one ld+json script", () => {
    const script = renderScript({ "@type": "BreadcrumbList" });

    expect(script).toHaveAttribute("type", "application/ld+json");
  });

  it("serializes the object so consumers can parse it back", () => {
    const data = { "@context": "https://schema.org", "@type": "Product", name: "Shell Jacket" };

    expect(JSON.parse(renderScript(data).textContent ?? "")).toEqual(data);
  });

  // The attack this exists to stop: API text containing </script> would otherwise close
  // the block and let the rest of the string be parsed as markup.
  it("escapes < so API text cannot close the script tag", () => {
    const script = renderScript({ name: "</script><img src=x onerror=alert(1)>" });

    expect(script.textContent).not.toContain("</script>");
    expect(script.textContent).toContain("\\u003c");
  });

  it("escapes every < in the payload, not just the first", () => {
    const script = renderScript({ a: "<one>", b: "<two>" });

    expect(script.textContent).not.toContain("<");
  });

  it("keeps the escaped value equal to the original after parsing", () => {
    const name = "Shell <Jacket>";

    expect(JSON.parse(renderScript({ name }).textContent ?? "")).toEqual({ name });
  });

  it("does not create a DOM node from injected markup", () => {
    const { container } = render(<JsonLd data={{ name: "</script><img src=x>" }} />);

    expect(container.querySelector("img")).toBeNull();
  });
});
