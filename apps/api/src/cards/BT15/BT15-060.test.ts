import { effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-060.js";
import "../index.js";

describe("BT15-060", () => {
  it("matches the catalog identity and black level-4 evolution route", () => {
    expect(getCardDefinition("BT15-060")).toMatchObject({
      nameEn: "Omekamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 3 }],
      types: ["Puppet", "X Antibody"],
    });
  });

  it("keeps the Omnimon alias reveal-scoped and retains Blocker", () => {
    expect(effectiveStaticNames(getCardDefinition("BT15-060")!)).toEqual(["Omekamon"]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Omnimon"],
      condition: { kind: "triggerRevealedFromDeck" },
    });
    expect(compiled.effects?.[2]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      reduceCost: 2,
      optional: true,
      condition: { kind: "isYourTurn" },
    });
  });
  it("once per turn de-digivolves an opposing Digimon to level 3 as an inherited effect", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }],
    }));

  it("naturally reveals Omekamon as an Omnimon-named card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-020", as: "source" }],
          deck: [{ card: "BT5-024", as: "garurumon" }, { card: "BT15-060", as: "omekamon" }, "BT5-021"],
        },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT5-024", "BT15-060"]);
  });

  it("naturally digivolves another black Greymon and applies the cost reduction on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-055", as: "base" }],
          hand: [
            { card: "BT15-060", as: "omekamon" },
            { card: "BT2-057", as: "greymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT2-057");

    expect(s.perm("base").topCard?.cardId).toBe("BT2-057");
    expect(s.state.memory).toBe(5);
    expect(observe(s.engine).hasKeyword(s.perm("omekamon"), "Blocker")).toBe(true);
  });

  it("naturally de-digivolves the opponent on attack through the inherited effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-063", as: "attacker", under: ["BT15-060"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT15-058", as: "target", under: ["BT15-055"] },
            { card: "BT15-058", as: "targetAgain", under: ["BT15-055"] },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );

    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("target").topCard?.cardId === "BT15-055" &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT15-058");
    expect(s.perm("target").topCard?.cardId).toBe("BT15-055");
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    preferInstanceIds.push(s.perm("targetAgain").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 3,
    );
    expect(s.perm("targetAgain").topCard?.cardId).toBe("BT15-058");
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("targetAgain").topCard?.cardId === "BT15-055" &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("targetAgain").topCard?.cardId).toBe("BT15-055");
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
