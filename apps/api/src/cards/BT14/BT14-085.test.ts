import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-085.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-085", () => {
  it("reveals three and adds a Vegetation, Plant, or Fairy Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" }] } }],
    }));
  it("watches effect suspension of any Digimon rather than only Mimi", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectSuspends",
      triggerFilter: { kind: ["Digimon"] },
    }));
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));
  it("adds a revealed Vegetation Digimon and bottoms the remaining reveal", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-085", as: "mimi" }], deck: ["BT14-044", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("naturally gains memory when an effect suspends a Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-085", as: "mimi" }, { card: "BT14-044", as: "payment" }],
          hand: [{ card: "BT14-043", as: "koDokugumon" }],
        },
        1: { battleArea: [{ card: "BT14-069", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("payment").permanentId);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koDokugumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("mimi").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-071", as: "attacker" }] }, 1: { security: [{ card: "BT14-085", as: "securityMimi" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-085"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-085")).toBe(true);
  });
});
