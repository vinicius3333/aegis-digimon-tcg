import { LocalPresence, LocalDriver, type Presence, type matchMaker } from "colyseus";
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";
import { readClusterConfig, type ClusterConfig } from "./config.js";
import { createLocalRoomCodeDirectory, createSharedRoomCodeDirectory, type RoomCodeDirectory } from "./roomCodes.js";
import { log } from "../logger.js";

export interface ClusterRuntime {
  clustered: boolean;
  publicAddress: string | undefined;
  presence: Presence;
  driver: matchMaker.MatchMakerDriver;
  roomCodes: RoomCodeDirectory;
  /** Tell the slot's other processes that the drain state changed. */
  broadcastAcceptingNewRooms: (accepting: boolean) => void;
  /** Run `apply` whenever another process of this slot changes the drain state. */
  onAcceptingNewRoomsChanged: (apply: (accepting: boolean) => void) => void;
  shutdown: () => Promise<void>;
}

/**
 * Build the matchmaking backbone this process runs on.
 *
 * With no `AEGIS_REDIS_URL` this is exactly what Colyseus does by itself — local presence, local
 * driver, no public address — so single-process deployments, development and the test suite are
 * unaffected. With one, every process of the slot shares a Redis namespace and the matchmaker can
 * place a room on any of them.
 */
export function createClusterRuntime(env: NodeJS.ProcessEnv = process.env): ClusterRuntime {
  const config: ClusterConfig = readClusterConfig(env);

  if (config.redisUrl === undefined) {
    return {
      clustered: false,
      publicAddress: undefined,
      presence: new LocalPresence(),
      driver: new LocalDriver(),
      roomCodes: createLocalRoomCodeDirectory(),
      broadcastAcceptingNewRooms: () => {},
      onAcceptingNewRoomsChanged: () => {},
      shutdown: () => Promise.resolve(),
    };
  }

  const presence = new RedisPresence(config.redisUrl);
  const driver = new RedisDriver(config.redisUrl);
  const drainTopic = `${config.keyPrefix}accepting-new-rooms`;

  log(`[cluster] ${JSON.stringify({ publicAddress: config.publicAddress, keyPrefix: config.keyPrefix })}`);

  return {
    clustered: true,
    publicAddress: config.publicAddress,
    presence,
    driver,
    roomCodes: createSharedRoomCodeDirectory(presence, config.keyPrefix),
    broadcastAcceptingNewRooms: (accepting) => presence.publish(drainTopic, accepting ? "1" : "0"),
    onAcceptingNewRoomsChanged: (apply) => {
      void presence.subscribe(drainTopic, (value: string) => apply(value === "1"));
    },
    shutdown: async () => {
      await driver.shutdown();
      await presence.shutdown();
    },
  };
}
