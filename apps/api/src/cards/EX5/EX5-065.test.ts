import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-065.js";
import "./EX5-065.js";
import "../index.js";

describe("EX5-065 Sayo & Koh", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("EX5-065")).toMatchObject({
      cardId: "EX5-065",
      nameEn: "Sayo & Koh",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["Night Claw"],
      effectText: expect.stringContaining("[Start of Opponent's Turn]"),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
  });
  it("registers the your-turn add-digivolution memory effect and opponent-turn start effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(watcher?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      requirePlacedOwnTopAtStackBottom: true,
    });
    expect(module.effectsForTiming(EffectTiming.OnStartTurn, source)[0]?.description).toContain("DNA digivolve");
  });
  it("registers the mandatory security play effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.optional).toBe(false);
  });
  it("documents the end-of-turn return for the Digimon played from digivolution cards", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.OnStartTurn, source)[0]?.description).toContain(
      "return the Digimon played",
    );
  });

  it("reacts to a public Koh & Sayo top-card placement, not a synthetic bus event", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-065", as: "sayo" },
            { card: "EX5-017", as: "placementHost", under: ["BT1-009"] },
            { card: "BT1-019", as: "evoBase" },
          ],
          hand: [
            { card: "EX5-064", as: "koh" },
            { card: "EX5-020", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("evoBase").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("evoBase").topCard?.cardId === "EX5-020");
    expect(s.perm("sayo").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.perm("placementHost").topCard?.cardId).toBe("BT1-009");
  });

  it("does not trigger for ordinary digivolution-card addition, per Q3669", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-065", as: "sayo" },
            { card: "BT1-076", as: "host" },
          ],
          hand: [{ card: "BT1-080", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-080", 2000);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-080");
    expect(s.perm("sayo").isSuspended).toBe(false);
  });

  it("uses the public opponent-turn start to play a stack card, DNA digivolve, and return it at turn end", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-065", as: "sayo" },
            { card: "EX5-017", as: "host", under: ["BT1-070"] },
            { card: "BT12-052", as: "otherMaterial" },
          ],
          hand: [{ card: "ST9-05", as: "dnaResult" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-025", as: "opponent" }], deck: Array.from({ length: 8 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferredIds },
    );
    const playedStackCardId = s.perm("host").stack[0]!.instanceId;
    preferredIds.push(s.perm("host").permanentId, playedStackCardId);
    await s.ready();
    const openingTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await openingTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST9-05"));
    const dnaResult = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST9-05");
    expect(dnaResult?.stack.map((entry) => entry.cardId)).toEqual(expect.arrayContaining(["EX5-017", "BT1-070"]));
    expect(
      s.state.players[1]!.battleArea.find(
        (permanent) => permanent.topCard?.instanceId === s.inst("opponent").instanceId,
      )?.isSuspended,
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("dnaResult").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("host").instanceId)).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.players[0]!.hand.some((entry) => entry.instanceId === playedStackCardId));
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === playedStackCardId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST9-05")?.stack.map(
        (entry) => entry.cardId,
      ),
    ).toEqual(["EX5-017"]);
    await turn;
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX5-065", as: "source" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX5-065"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
