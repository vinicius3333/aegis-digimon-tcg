/**
 * How this process participates in a multi-process deployment.
 *
 * Single-process is the default and stays byte-identical to the previous behaviour: no Redis, the
 * in-memory presence and driver Colyseus ships with, and no public address. Cluster mode turns on
 * only when `AEGIS_REDIS_URL` is set, which is what makes this safe to merge ahead of the
 * infrastructure that uses it.
 */
export interface ClusterConfig {
  /** Redis connection string shared by every process of one deployment slot. */
  redisUrl: string | undefined;
  /**
   * Key namespace for this slot's matchmaking state.
   *
   * Slots must not see each other's rooms: a draining slot keeps serving its own matches while the
   * active slot takes new ones, which is exactly the isolation a shared driver would destroy.
   */
  keyPrefix: string;
  /**
   * Where clients reach THIS process, as `host/path` with no scheme.
   *
   * Colyseus returns it with the seat reservation and the client SDK connects there, so the edge
   * proxy has to route the path to this process and nowhere else. Undefined in single-process
   * mode, where every address is the same address.
   */
  publicAddress: string | undefined;
}

/** Strip scheme and trailing slash: `https://aegis-digi.online/` -> `aegis-digi.online`. */
function hostOf(url: string): string {
  return url.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
}

export function readClusterConfig(env: NodeJS.ProcessEnv): ClusterConfig {
  const redisUrl = env.AEGIS_REDIS_URL?.trim() || undefined;
  const slot = env.AEGIS_DEPLOYMENT_SLOT ?? "legacy";
  const processPath = env.AEGIS_PROCESS_PATH?.trim() || undefined;
  const publicHost = env.AEGIS_PUBLIC_HOST?.trim() || env.AEGIS_API_URL?.trim() || undefined;

  if (redisUrl !== undefined && processPath === undefined) {
    // A cluster whose processes all advertise the same address hands every client to whichever
    // process the load balancer happens to pick, and the seat reservation it was given lives on
    // another one. That fails as a puzzling "room not found", so refuse it at boot instead.
    throw new Error(
      "AEGIS_PROCESS_PATH must be set when AEGIS_REDIS_URL is set (each process needs a unique public path)",
    );
  }
  if (processPath !== undefined && publicHost === undefined) {
    throw new Error("AEGIS_PUBLIC_HOST (or AEGIS_API_URL) must be set when AEGIS_PROCESS_PATH is set");
  }

  return {
    redisUrl,
    keyPrefix: `aegis:${slot}:`,
    publicAddress:
      processPath === undefined || publicHost === undefined ? undefined : `${hostOf(publicHost)}/${processPath}`,
  };
}
