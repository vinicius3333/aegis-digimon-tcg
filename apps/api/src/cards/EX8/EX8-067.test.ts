import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-067.js";

describe("EX8-067", () => {
  it("sets memory to 3 at the start of your turn when it is 2 or less", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    }));
  it("places up to 2 Mineral/Rock cards from trash under a Mineral/Rock Digimon by suspending itself when one digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      actions: [{ kind: "PlaceUnder", optional: true, cost: { kind: "suspend" } }],
    }));
  it("plays itself from security without paying its cost", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("moves the exact security Tamer into the battle area during a security check", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "EX8-067", as: "securityCard" }] } });
    const instanceId = s.inst("securityCard").instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.cardId === "EX8-067"));
    expect((s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect((s.state.players[1] as PlayerState).security.some((card) => card.instanceId === instanceId)).toBe(false);
  });
});
