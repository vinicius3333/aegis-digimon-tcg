// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import type { AnimationStepContext } from "../animationQueue";
import { Side } from "../side";
import { waitForHandArrivalClock } from "./handArrivalClock";

afterEach(() => document.body.replaceChildren());

function animation(age: () => number, name = "battle-hand-draw") {
  return {
    animationName: name,
    get currentTime() {
      return age();
    },
    playState: "paused",
    effect: { getTiming: () => ({ delay: 0 }), getComputedTiming: () => ({ duration: 80 }) },
  } as unknown as Animation;
}

it("keeps the next addition behind a late decoded physical hand entry", async () => {
  const root = document.createElement("div");
  root.dataset.handInstanceId = "searched";
  root.className = "game-hand-card--arrival-pending";
  document.body.append(root);
  let age = 0;
  let waits = 0;
  root.getAnimations = () => [animation(() => age)];
  await waitForHandArrivalClock({
    side: Side.Viewer,
    instanceId: "searched",
    context: {
      mode: "live",
      cancelled: false,
      skipping: false,
      async wait(ms) {
        waits++;
        if (root.className === "") age += ms;
        if (waits === 5) root.className = "";
      },
    },
  });
  expect(waits).toBe(10);
  expect(age).toBe(80);
});

it("reads the newest opaque opponent slot's own animation without card identities", async () => {
  const root = document.createElement("div");
  root.dataset.opponentHandSlot = "2";
  document.body.append(root);
  let age = 16;
  root.getAnimations = () => [animation(() => age, "battle-opponent-hand-entry")];
  await waitForHandArrivalClock({
    side: Side.Opponent,
    context: {
      mode: "live",
      cancelled: false,
      skipping: false,
      async wait(ms) {
        age += ms;
      },
    },
  });
  expect(age).toBe(80);
  expect(root.dataset.handInstanceId).toBeUndefined();
});

it.each(["cancelled", "skipping"] as const)("releases a pending face on %s", async (flag) => {
  const root = document.createElement("div");
  root.dataset.handInstanceId = "searched";
  root.className = "game-hand-card--arrival-pending";
  document.body.append(root);
  let waits = 0;
  let stopped = false;
  const context: AnimationStepContext = {
    mode: "live",
    get cancelled() {
      return flag === "cancelled" && stopped;
    },
    get skipping() {
      return flag === "skipping" && stopped;
    },
    async wait() {
      waits++;
      stopped = true;
    },
  };
  await waitForHandArrivalClock({ side: Side.Viewer, instanceId: "searched", context });
  expect(waits).toBe(1);
});
