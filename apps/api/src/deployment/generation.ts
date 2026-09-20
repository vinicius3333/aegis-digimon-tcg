import type { DeploymentSlot } from "./runtime.js";

type DeploymentIdentityEnvironment = Readonly<
  Partial<Pick<NodeJS.ProcessEnv, "AEGIS_DEPLOYMENT_SLOT" | "AEGIS_DEPLOYMENT_GENERATION_ID">>
>;

/**
 * Resolve the one generation identity used by deployment and room handoff.
 * `AEGIS_DEPLOYMENT_SLOT` is canonical; the older optional generation override is
 * accepted only when it agrees, so owner records cannot diverge from process routing.
 */
export function resolveDeploymentIdentity(
  env: DeploymentIdentityEnvironment = process.env,
): { slot: DeploymentSlot; generationId: string } {
  const slot = env.AEGIS_DEPLOYMENT_SLOT ?? "legacy";
  if (!/^(?:blue|green|legacy|g-[a-f0-9]{12})$/.test(slot)) {
    throw new Error(`Invalid AEGIS_DEPLOYMENT_SLOT: ${slot}`);
  }

  const generationOverride = env.AEGIS_DEPLOYMENT_GENERATION_ID;
  if (generationOverride !== undefined && generationOverride !== "" && generationOverride !== slot) {
    throw new Error("AEGIS_DEPLOYMENT_GENERATION_ID must match AEGIS_DEPLOYMENT_SLOT");
  }

  return { slot: slot as DeploymentSlot, generationId: slot };
}
