import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-028.js";

describe("BT14-028", () => {
  it("preserves ShogunGekomon's catalog identity and complete IR", () => {
    expect(getCardDefinition("BT14-028")).toMatchObject({
      nameEn: "ShogunGekomon",
      colors: ["Blue"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      attributes: ["Virus"],
      types: ["Amphibian"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "beDeletedInBattle",
              duration: "untilOpponentTurnEnd",
              target: { isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("evolves legally from Gekomon and uses Blocker through the public attack window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-024", as: "base" }],
        hand: [{ card: "BT14-028", as: "shogun" }],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 3000 }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shogun").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-028");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-024"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-020"));
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q2396 survives losing a security battle after an opposing source is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-028", as: "shogun" }],
          hand: [{ card: "BT14-026", as: "zudomon" }],
        },
        1: {
          battleArea: [{ card: "BT14-016", as: "sourceHost", under: ["BT14-001", "BT14-007", "BT14-012"] }],
          security: ["BT14-026"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("shogun"), "beDeletedInBattle"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shogun").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-028")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT14-028");
    assertNoLoudGap(s);
  });

  it("Q2397 still deletes the protected Digimon when Retaliation resolves by effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-028", as: "shogun" }],
          hand: [{ card: "BT14-026", as: "zudomon" }],
        },
        1: {
          battleArea: [
            { card: "BT14-016", as: "returnTarget", under: ["BT14-012"] },
            { card: "BT11-079", as: "retaliation", under: ["BT14-001", "BT14-002"], suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("shogun"), "beDeletedInBattle"));
    expect(s.perm("retaliation").stack).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shogun").permanentId,
        target: { kind: "permanent", permanentId: s.perm("retaliation").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-028"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-028")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT11-079");
    assertNoLoudGap(s);
  });

  it("resets source-trash protection on the next natural turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-028", as: "shogun", under: ["BT14-024"] }],
          hand: [{ card: "BT1-099", as: "firstOption" }, { card: "BT1-099", as: "secondOption" }, "BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          hand: ["BT1-009"],
          battleArea: [
            { card: "BT1-037", as: "firstTarget", under: ["BT1-028"] },
            { card: "BT1-037", as: "secondTarget", under: ["BT1-028"] },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("firstTarget").topCard.instanceId);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("shogun"), "beDeletedInBattle"));
    expect(s.perm("shogun").stack).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("shogun"), "beDeletedInBattle")).toBe(false);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("secondTarget").topCard.instanceId);

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("shogun"), "beDeletedInBattle"));
    expect(s.perm("shogun").stack).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    assertNoLoudGap(s);
  });
});
