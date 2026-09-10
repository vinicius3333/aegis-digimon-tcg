import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-061.js";
import "../index.js";

function attack(s: ReturnType<typeof setupEngine>, seat: 0 | 1, attacker: string, target: string) {
  return s.engine.applyIntent(seat, {
    type: "attack",
    attackerPermanentId: s.perm(attacker).permanentId,
    target: { kind: "permanent" as const, permanentId: s.perm(target).permanentId },
  });
}

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

describe("EX7-061 Lilithmon (X Antibody)", () => {
  it("matches the catalog, rulings, and fully registered IR", () => {
    expect(getCardDefinition("EX7-061")).toMatchObject({
      cardId: "EX7-061",
      nameEn: "Lilithmon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "X Antibody", "Seven Great Demon Lords"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Lilithmon"], cost: 1, isAlternate: true }]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Lilithmon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "deleteOwn", target: { count: 1, filter: { excludeSelf: true, kind: ["Digimon"] } } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
          actions: [
            { kind: "PlayWithoutCost", condition: { kind: "isYourTurn" } },
            { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-061")).toBe(true);
  });

  it.each([
    ["named Lilithmon route", "BT3-091", 1],
    ["standard purple level 5 route", "EX7-056", 4],
  ])("evolves by the %s with exact payment, draw, and stack", async (_label, base, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "EX7-061", as: "lilithX" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithX").instanceId,
        useAlternateCost: base === "BT3-091",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-061");
    expect(s.state.memory).toBe(5 - cost);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects an off-color, non-Lilithmon level 5 evolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-022", as: "base" }],
        hand: [{ card: "EX7-061", as: "lilithX" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithX").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
  });

  it("does not prevent a real battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "lilith", "defender")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-061")).toBe(true);
  });

  it.each([
    ["Lilithmon name", "BT3-091"],
    ["X Antibody trait", "BT9-109"],
  ])(
    "prevents Retaliation deletion by deleting another Digimon with a qualifying %s source",
    async (_label, source) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX7-061", as: "lilith", under: [source] },
              { card: "BT1-009", as: "cost" },
            ],
          },
          1: { battleArea: [{ card: "BT10-082", as: "retaliation", suspended: true, dp: 5000, under: ["EX7-056"] }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
      );
      await s.ready();
      expect(attack(s, 0, "lilith", "retaliation")).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX7-061"]);
      expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    },
  );

  it.each([
    ["without a qualifying source", false],
    ["when the optional cost is declined", true],
  ])("leaves to Retaliation %s", async (_label, decline) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", ...(decline ? { under: ["BT3-091"] } : {}) },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT10-082", as: "retaliation", suspended: true, dp: 5000, under: ["EX7-056"] }] },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "lilith", "retaliation")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-061")).toBe(true);
  });

  it("Q3866 leaves when Armor Purge prevents the accepted cost deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT8-039", as: "protectedCost", under: ["BT8-046"] },
          ],
        },
        1: { battleArea: [{ card: "BT10-082", as: "retaliation", suspended: true, dp: 5000, under: ["EX7-056"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "lilith", "retaliation")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT8-046"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX7-061", "BT8-039"]),
    );
  });

  it("Q3867 does not re-trigger a replacement after its cost targets another Lilithmon X", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [{ card: "EX7-048", as: "musketeer" }],
        },
        1: {
          battleArea: [
            { card: "EX7-061", as: "firstLilith", under: ["BT3-091"] },
            { card: "EX7-061", as: "secondLilith", under: ["BT3-091"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 6;
    await s.ready();
    preferred.push(s.inst("firstLilith").instanceId, s.inst("secondLilith").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("secondLilith").instanceId,
    ]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("firstLilith").instanceId)).toBe(
      true,
    );
  });

  it("plays a purple level 4 for free when another Digimon is deleted on its turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-061", as: "lilith" }], trash: [{ card: "BT11-078", as: "target" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "lilith", "victim")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT11-078"));
    expect(s.state.memory).toBe(0);
  });

  it("trashes only the opponent's top Security when another Digimon is deleted on their turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-061", as: "lilith" },
          { card: "BT1-009", as: "victim", suspended: true, dp: 3000 },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(attack(s, 1, "attacker", "victim")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("uses the deletion response once per turn and rearms on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith" },
            { card: "BT1-039", as: "firstAttacker", dp: 9000 },
            { card: "BT1-040", as: "secondAttacker", dp: 9000 },
          ],
          trash: [
            { card: "BT11-078", as: "firstPlay" },
            { card: "BT3-081", as: "secondPlay" },
          ],
          hand: ["BT1-009", "BT1-010"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 3000 },
            { card: "BT1-010", as: "second", suspended: true, dp: 3000 },
            { card: "BT1-014", as: "third", suspended: true, dp: 4000 },
          ],
          hand: ["BT1-009", "BT1-010"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack(s, 0, "firstAttacker", "first")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(4);
    expect(attack(s, 0, "secondAttacker", "second")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack(s, 0, "firstAttacker", "third")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(5);
    await stopLoop(s, loop, 0);
  });
});
