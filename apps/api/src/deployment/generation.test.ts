import { describe, expect, it } from "vitest";
import { resolveDeploymentIdentity } from "./generation.js";

describe("deployment generation identity", () => {
  it("uses the configured slot as canonical when the legacy generation override is absent", () => {
    expect(resolveDeploymentIdentity({ AEGIS_DEPLOYMENT_SLOT: "g-8dfce0e651dc" })).toEqual({
      slot: "g-8dfce0e651dc",
      generationId: "g-8dfce0e651dc",
    });
  });

  it("treats an empty optional override as absent for existing deployments", () => {
    expect(
      resolveDeploymentIdentity({
        AEGIS_DEPLOYMENT_SLOT: "green",
        AEGIS_DEPLOYMENT_GENERATION_ID: "",
      }),
    ).toEqual({ slot: "green", generationId: "green" });
  });

  it("accepts an explicit generation override only when it matches the slot", () => {
    expect(
      resolveDeploymentIdentity({
        AEGIS_DEPLOYMENT_SLOT: "green",
        AEGIS_DEPLOYMENT_GENERATION_ID: "green",
      }),
    ).toEqual({ slot: "green", generationId: "green" });
  });

  it("fails fast when the generation override diverges from the slot", () => {
    expect(() =>
      resolveDeploymentIdentity({
        AEGIS_DEPLOYMENT_SLOT: "g-8dfce0e651dc",
        AEGIS_DEPLOYMENT_GENERATION_ID: "g-861ae9396eda",
      }),
    ).toThrow("AEGIS_DEPLOYMENT_GENERATION_ID must match AEGIS_DEPLOYMENT_SLOT");
  });
});
