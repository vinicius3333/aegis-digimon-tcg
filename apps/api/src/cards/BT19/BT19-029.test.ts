import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT19-029.js";

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-029 Tapirmon", () => {
  it("matches the printed catalog text and compiles both printed clauses", () => {
    expect(getCardDefinition("BT19-029")).toMatchObject({
      cardId: "BT19-029",
      nameEn: "Tapirmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      effectText: "[On Play] By trashing your top security card, gain 1 memory.",
    });
    expect(getCardDefinition("BT19-029")!.inheritedEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[All Turns] [Once Per Turn] When this yellow Digimon with the [Data]/[Witchelny] trait would leave " +
        "the battle area by your opponent's effects, by trashing your top security card, it doesn't leave.",
    );
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            colors: ["Yellow"],
            nameOrTrait: [
              { tokens: ["Data"], match: "trait" },
              { tokens: ["Witchelny"], match: "trait", orPrevious: true },
            ],
          },
        },
      ],
    });
  });

  it("pays the printed On Play cost from a real hand play and gains exactly 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secNext").instanceId]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-029"]);
    assertNoLoudGap(s);
  });

  it("declining the optional On Play keeps the security stack and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("gains no memory when the security stack is empty, because the cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publicly digivolves from a yellow Lv.2 source for the printed cost of 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "ST22-01", as: "viximon" },
        hand: [{ card: "BT19-029", as: "tapir" }],
        security: [{ card: "BT1-009", as: "secTop" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
      },
      1: { security: INERT_SECURITY, deck: ["BT1-012"] },
    });
    s.state.memory = 0;
    await s.ready();
    const viximonId = s.inst("viximon").instanceId;
    const tapirId = s.inst("tapir").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: tapirId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === tapirId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([viximonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
  });

  it("refuses an illegal off-colour Lv.2 source and an illegal same-level source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        battleArea: [{ card: "BT19-029", as: "sameLevel" }],
        hand: [{ card: "BT19-029", as: "tapir" }],
        security: [{ card: "BT1-009", as: "secTop" }],
        deck: ["BT1-012"],
      },
      1: { security: INERT_SECURITY, deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    await s.ready();
    const tapirId = s.inst("tapir").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: tapirId,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sameLevel").permanentId,
        instanceId: tapirId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([tapirId]);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("redEgg").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["BT3-037", "Data"],
    ["BT26-022", "Witchelny"],
  ])(
    "prevents an opponent effect from removing a yellow %s host by trashing the top security card",
    async (hostCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: hostCard, as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
            security: [
              { card: "BT1-009", as: "secTop" },
              { card: "BT1-011", as: "secNext" },
            ],
            deck: ["BT1-012", "BT1-012"],
            hand: [{ card: "BT1-012", as: "spare" }],
          },
          1: {
            battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
            hand: [
              { card: "BT2-091", as: "flare" },
              { card: "BT1-012", as: "opponentSpare" },
            ],
            security: INERT_SECURITY,
            deck: ["BT1-012", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await openMain(s, 0);
      closeMain(s, 0);
      await openMain(s, 1);

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.length === 1);
      closeMain(s, 1);
      await stopLoop(s, loop, 1);

      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([hostCard]);
      expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("tapir").instanceId]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secNext").instanceId]);
      assertNoLoudGap(s);
    },
  );

  it("declining the prevention lets the opponent's effect delete the host and pays nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", "BT3-037"]);
  });

  it("prevents only once per turn and works again on the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTwo").instanceId,
      s.inst("secThree").instanceId,
    ]);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTwo").instanceId,
      s.inst("secThree").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT19-029", "BT3-037"]);
  });

  it("re-arms the once-per-turn prevention on the opponent's following turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    closeMain(s, 1);

    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT3-037"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secThree").instanceId]);
  });

  it.each([
    ["BT1-051", "a yellow Vaccine peer that has neither the [Data] nor the [Witchelny] trait"],
    ["BT1-014", "a red [Data] peer that is not yellow"],
  ])("does not protect %s (%s)", async (hostCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: hostCard, as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", hostCard].sort());
  });

  it("protects only the Digimon carrying this card, not a matching sibling (Q3087)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-037", as: "carrier", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] },
            { card: "BT9-035", as: "sibling", dp: 4000 },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("sibling").topCard!.instanceId, s.perm("sibling").permanentId);
    const siblingTopId = s.perm("sibling").topCard!.instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("carrier").topCard!.instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([siblingTopId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
  });

  it("does not prevent a battle deletion, which is not an opponent's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT6-038", as: "blocker", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", "BT3-037"]);
  });

  it("does not prevent a leave caused by the controller's OWN effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] },
            { card: "BT2-067", as: "purpleSource", dp: 3000 },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [
            { card: "BT7-107", as: "callingFromTheDarkness" },
            { card: "BT1-012", as: "spare" },
          ],
        },
        1: {
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("host").topCard!.instanceId, s.perm("host").permanentId);
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("callingFromTheDarkness").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT2-067"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", "BT3-037", "BT7-107"]);
  });

  it("does not protect a yellow host whose only near-match trait is [DATA SQUAD], not [Data]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-016", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["AD1-016", "BT19-029"]);
  });

  it.each([
    ["BT19-029", "the Tapirmon prevention"],
    ["BT19-041", "the host's own [All Turns] clause"],
  ])("lets the player order simultaneous would-leave effects, resolving %s first (Q3095)", async (preferredCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: [{ card: "BT1-012", as: "deckTop" }, "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [preferredCardId] },
    );
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-041"]);
    const trashedIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId);
    const expected =
      preferredCardId === "BT19-029"
        ? { trash: [s.inst("secTop").instanceId], security: [deckTopId, s.inst("secNext").instanceId] }
        : { trash: [deckTopId], security: [s.inst("secTop").instanceId, s.inst("secNext").instanceId] };
    expect({ trash: trashedIds, security: securityIds }).toEqual(expected);
  });
});
