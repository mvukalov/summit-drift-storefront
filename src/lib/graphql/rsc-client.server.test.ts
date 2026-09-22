import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionsDocument } from "./generated/graphql";
import { CACHE_TAGS, REVALIDATE_SECONDS } from "./config";
import { makeRscClient } from "./rsc-client";

// The init object Apollo's HttpLink passed to the last fetch call.
function lastFetchInit(spy: { mock: { calls: Parameters<typeof fetch>[] } }): RequestInit {
  return spy.mock.calls.at(-1)?.[1] ?? {};
}

describe("RSC Apollo client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("caches catalog queries in the Next.js data cache by default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await makeRscClient().query({ query: CollectionsDocument });

    expect(lastFetchInit(fetchSpy)).toMatchObject({
      method: "POST",
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAGS.catalog] },
    });
  });

  it("lets a single query override fetchOptions through context", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await makeRscClient().query({
      query: CollectionsDocument,
      context: { fetchOptions: { cache: "no-store" } },
    });

    expect(lastFetchInit(fetchSpy)).toMatchObject({ cache: "no-store" });
  });
});
