import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-064.js";
import "../BT22/BT22-069.js";
import "../BT22/BT22-072.js";
import "../index.js";

describe("EX5-064 Koh & Sayo", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-064")).toMatchObject({
      cardId: "EX5-064",
      nameEn: "Koh &amp; Sayo",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Light Fang"],
      effectText: expect.stringContaining(
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.[On Play] [Main] By suspending this Tamer",
      ),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
  });
  it("offers free evolution from hand with the compound suspend and Light Fang/Night Claw cost", () => {
    for (const trigger of ["OnPlay", "Main"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
        into: { controllerDefault: "mine", kind: ["Digimon"] },
        cost: {
          kind: "compound",
          costs: [
            { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
            {
              kind: "placeOwnTopAtStackBottom",
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
                },
              },
            },
          ],
        },
      });
    }
  });
  it("plays itself for free from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });

  it("sets memory to 3 on the public turn loop at and above the boundary", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-064", as: "tamer" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 2;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("plays a free evolution after suspending and bottom-placing a Night Claw top card", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-017", as: "placementHost", under: ["BT1-009"] },
            { card: "BT1-019", as: "evoBase" },
          ],
          hand: [
            { card: "EX5-064", as: "tamer" },
            { card: "EX5-020", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("evoBase").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("evoBase").topCard?.cardId === "EX5-020");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("placementHost").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("placementHost").stack.map((card) => card.cardId)).toEqual(["EX5-017"]);
    expect(s.perm("evoBase").topCard?.cardId).toBe("EX5-020");
    expect(s.state.memory).toBe(6);
  });

  it("covers Q4931 with the public BT22-072 evolution that plays BT22-102 beside Koh & Sayo", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-064", as: "koh" },
            { card: "BT22-069", as: "host", under: ["BT22-069"] },
          ],
          hand: [
            { card: "BT22-072", as: "evolving" },
            { card: "BT22-102", as: "sayo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolving").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT22-102"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT22-102")).toBe(true);
    expect(s.perm("host").topCard?.cardId).toBe("BT22-072");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT22-069", "BT22-069"]);
    expect(s.perm("koh").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("answers Q5212/Q5393 with a legal level-3 promotion after the Light Fang top card rotates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "placementHost", under: ["BT6-006"] }],
          hand: [
            { card: "EX5-064", as: "tamer" },
            { card: "BT14-069", as: "levelThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("placementHost").topCard?.cardId === "BT14-069");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("placementHost").topCard?.cardId).toBe("BT14-069");
    expect(s.perm("placementHost").stack.map((card) => card.cardId)).toEqual(["EX5-017", "BT6-006"]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not use a non-Light-Fang/Night-Claw Digimon for the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [
            { card: "EX5-064", as: "tamer" },
            { card: "EX5-017", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-017")).toBe(true);
  });

  it("plays itself when an opponent's public attack checks its security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX5-064", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-064"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-064")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX5-064")).toBe(false);
  });
});
