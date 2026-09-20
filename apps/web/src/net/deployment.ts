export type DeploymentSlot = "blue" | "green" | `g-${string}`;

export interface DeploymentRevision {
  slot: DeploymentSlot;
  revision: string;
}

export interface DeploymentManifest {
  version: 1;
  webRevision?: string;
  active: DeploymentRevision;
  draining: DeploymentRevision[];
}

interface LocationLike {
  protocol: string;
  host: string;
}

interface NavigationLike {
  href: string;
  replace: (url: string) => void;
}

const MANIFEST_TIMEOUT_MS = 5_000;

/** Direct production builds use the same-origin API instead of slot routing. */
export function usesSlotDeploymentRouter({
  production,
  deploymentMode,
}: {
  production: boolean;
  deploymentMode: string | undefined;
}): boolean {
  return production && deploymentMode !== "direct";
}

export class DeploymentRefreshScheduledError extends Error {
  constructor() {
    super("Updating Aegis to the current version");
    this.name = "DeploymentRefreshScheduledError";
  }
}

export function parseDeploymentManifest(input: unknown): DeploymentManifest {
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    (input.webRevision !== undefined && !isSafeRevision(input.webRevision)) ||
    !isRevision(input.active) ||
    !Array.isArray(input.draining)
  ) {
    throw invalidManifest();
  }
  const draining = input.draining;
  if (!draining.every(isRevision)) throw invalidManifest();
  const slots = [input.active.slot, ...draining.map(({ slot }) => slot)];
  if (new Set(slots).size !== slots.length) throw invalidManifest();
  return {
    version: 1,
    ...(typeof input.webRevision === "string" ? { webRevision: input.webRevision } : {}),
    active: input.active,
    draining,
  };
}

export async function loadDeploymentManifest(
  fetcher: typeof fetch = fetch,
  bundleRevision?: string,
): Promise<DeploymentManifest> {
  const response = await fetcher("/deployment/manifest.json", {
    cache: "no-store",
    signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      ...(bundleRevision ? { "x-aegis-web-revision": bundleRevision } : {}),
    },
  });
  if (!response.ok) throw new Error(`Deployment manifest unavailable (${response.status})`);
  return parseDeploymentManifest(await response.json());
}

/**
 * Prevent a bundle retained across a blue/green cutover from opening a room on
 * a revision it was not built for. Returns false after scheduling navigation,
 * allowing the entry point to stop before rendering or opening a connection.
 */
export async function synchronizeDeploymentRevision({
  bundleRevision,
  fetcher = fetch,
  navigation,
}: {
  bundleRevision: string | undefined;
  fetcher?: typeof fetch;
  navigation: NavigationLike;
}): Promise<boolean> {
  if (!bundleRevision || bundleRevision === "development") return true;

  const manifest = await loadDeploymentManifest(fetcher, bundleRevision);
  return ensureDeploymentRevision({ manifest, bundleRevision, navigation });
}

/** Load the routing decision and abort a new-room operation when its bundle is stale. */
export async function loadCurrentDeploymentManifest({
  bundleRevision,
  fetcher = fetch,
  navigation,
}: {
  bundleRevision: string | undefined;
  fetcher?: typeof fetch;
  navigation: NavigationLike;
}): Promise<DeploymentManifest> {
  const manifest = await loadDeploymentManifest(fetcher, bundleRevision);
  if (!ensureDeploymentRevision({ manifest, bundleRevision, navigation })) {
    throw new DeploymentRefreshScheduledError();
  }
  return manifest;
}

function ensureDeploymentRevision({
  manifest,
  bundleRevision,
  navigation,
}: {
  manifest: DeploymentManifest;
  bundleRevision: string | undefined;
  navigation: NavigationLike;
}): boolean {
  const currentWebRevision = manifest.webRevision ?? manifest.active.revision;
  if (!bundleRevision || bundleRevision === "development" || currentWebRevision === bundleRevision) return true;

  const reloadUrl = new URL(navigation.href);
  if (reloadUrl.searchParams.get("aegis-revision") === currentWebRevision) {
    throw new Error("The current web version does not match the active deployment");
  }
  reloadUrl.searchParams.set("aegis-revision", currentWebRevision);
  navigation.replace(reloadUrl.toString());
  return false;
}

export function deploymentEndpoint(
  location: LocationLike,
  slot: DeploymentSlot,
): {
  http: string;
  websocket: string;
} {
  const secure = location.protocol === "https:";
  return {
    http: `${secure ? "https" : "http"}://${location.host}/api/${slot}`,
    websocket: `${secure ? "wss" : "ws"}://${location.host}/api/${slot}`,
  };
}

function isRevision(value: unknown): value is DeploymentRevision {
  return (
    isRecord(value) &&
    typeof value.slot === "string" &&
    /^(?:blue|green|g-[a-f0-9]{12})$/.test(value.slot) &&
    isSafeRevision(value.revision)
  );
}

function isSafeRevision(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidManifest(): Error {
  return new Error("Invalid deployment manifest");
}
