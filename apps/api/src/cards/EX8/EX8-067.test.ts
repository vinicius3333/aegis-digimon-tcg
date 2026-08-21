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
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.cardId === "EX8-067"));
    expect((s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect((s.state.players[1] as PlayerState).security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("suspends to place up to two Mineral cards under the Digimon that digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "base" }, { card: "EX8-067", as: "tamer" }],
          hand: [{ card: "EX8-048", as: "evolving" }],
          trash: ["EX8-049", "EX8-050"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("base").stack.length === 3);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("EX8-048");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX8-047", "EX8-049", "EX8-050"]));
    expect(s.state.players[0]!.trash.some((card) => ["EX8-049", "EX8-050"].includes(card.cardId))).toBe(false);
  });
});
