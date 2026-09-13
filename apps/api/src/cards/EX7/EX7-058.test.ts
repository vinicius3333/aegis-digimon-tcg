import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-058.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-058 LadyDevimon (X Antibody)", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-058")).toMatchObject({
      cardId: "EX7-058",
      nameEn: "LadyDevimon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Fallen Angel", "X Antibody"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "GrantAuraToOpponents",
          target: { count: 1 },
          effectText: "[End of Attack] Delete this Digimon.",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "PlayToken", tokens: ["Volée & Zerdrücken"], count: 1, payCost: false, optional: true },
      ]);
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["LadyDevimon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-058")).toBe(true);
  });

  it("publicly evolves from LadyDevimon for 0 and plays the token with exact identity and stats", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-053", as: "base" }],
          hand: [{ card: "EX7-058", as: "ladyX" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ladyX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken"),
    );
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken",
    )!;
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(getCardDefinition(token.topCard.cardId)).toMatchObject({ level: 4, dp: 5000, colors: ["Purple"] });
    expect(token.currentDP).toBe(5000);
  });

  it("the played Volée & Zerdrücken token exposes Blocker and Retaliation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-053", as: "base" }],
          hand: [{ card: "EX7-058", as: "ladyX" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ladyX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken"),
    );
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken",
    )!;
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Retaliation")).toBe(true);
  });

  it("public On Play grant deletes only its recipient after that opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-058", as: "ladyX" }], security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "recipient" },
            { card: "BT1-010", as: "bystander" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyX").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-058"));
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("recipient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    await stopLoop(s, loop, 1);
  });

  it("Q3864: grants the effect to an attacker that becomes immune, but it does not trigger", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-058", as: "ladyX" }], security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012"] },
        1: { battleArea: [{ card: "BT15-047", as: "immune" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyX").instanceId })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("immune").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-047")).toBe(true);
    await stopLoop(s, loop, 1);
  });

  it("Q3865: self-deletion from the grant does not trigger Partition", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-058", as: "ladyX" }], security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [{ card: "AD1-011", as: "partition", under: ["BT12-021", "BT12-047"] }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyX").instanceId })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("partition").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-011"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-011", "BT12-021", "BT12-047"]),
    );
    await stopLoop(s, loop, 1);
  });

  it("inherits one free purple level-4 play across two opponent deletions in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-082", as: "host", under: ["EX7-058"] },
            { card: "BT10-022", as: "defender", suspended: true, dp: 9000 },
          ],
          trash: [
            { card: "EX7-053", as: "firstPlay" },
            { card: "EX7-054", as: "secondPlay" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-010", as: "secondAttacker" },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("defender").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("firstPlay").instanceId,
      ),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("secondPlay").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondPlay").instanceId)).toBe(true);
    await stopLoop(s, loop, 1);
  });
});
