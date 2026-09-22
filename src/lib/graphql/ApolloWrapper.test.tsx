import { resetApolloClientSingletons } from "@apollo/client-integration-nextjs";
import { useApolloClient } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApolloWrapper } from "./ApolloWrapper";

function ClientProbe() {
  const client = useApolloClient();
  return <p>{client ? "client ready" : "no client"}</p>;
}

describe("ApolloWrapper", () => {
  afterEach(() => {
    resetApolloClientSingletons();
  });

  it("provides an Apollo client to client components", () => {
    render(
      <ApolloWrapper>
        <ClientProbe />
      </ApolloWrapper>,
    );

    expect(screen.getByText("client ready")).toBeInTheDocument();
  });
});
