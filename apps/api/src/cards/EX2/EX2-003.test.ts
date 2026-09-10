import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-003.js";
import "../BT8/BT8-097.js";
import "../BT17/BT17-035.js";
import "../BT10/BT10-100.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";
import "../ST22/ST22-05.js";
import "../ST22/ST22-10.js";
import { compiled } from "./EX2-003.js";

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const FILLER_DECK = [
  "BT1-009",
  "BT1-010",
  "BT1-011",
  "BT1-012",
  "BT1-013",
  "BT1-014",
  "BT1-009",
  "BT1-010",
  "BT1-011",
  "BT1-012",
  "BT1-013",
  "BT1-014",
];

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

describe("EX2-003 Viximon", () => {
  it("matches the catalog and compiles the inherited cost-gated watcher", () => {
    expect(getCardDefinition("EX2-003")).toMatchObject({
      cardId: "EX2-003",
      nameEn: "Viximon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      types: ["Lesser"],
    });
    expect(getCardDefinition("EX2-003")!.inheritedEffectText).toContain(
      "When you use an Option card with a cost of 2 or more",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: {
              kind: "triggerOptionCostAtLeast",
              value: 2,
              raw: "when you use an Option card with a cost of 2 or more",
            },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("proves the inherited effect through a legal egg evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX2-003", as: "egg" }],
          hand: [
            { card: "EX2-020", as: "lopmon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...FILLER_DECK],
          security: ["BT1-009"],
        },
        1: { security: INERT_SECURITY, deck: FILLER_DECK },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-003");
    const egg = s.state.players[0]!.breeding!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("lopmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard?.cardId === "EX2-020");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX2-003"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX2-003"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("applies once per turn and re-arms on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-021", as: "host", under: ["EX2-003"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "BT4-104", as: "fund" },
            { card: "BT1-102", as: "optionOne" },
            { card: "BT1-102", as: "optionTwo" },
            { card: "BT1-102", as: "optionThree" },
          ],
          deck: [
            { card: "BT1-013", as: "drawnOne" },
            { card: "BT1-014", as: "drawnTwo" },
          ],
          security: ["BT1-009"],
        },
        1: { security: INERT_SECURITY, deck: FILLER_DECK },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    const play = async (alias: string, until: () => boolean): Promise<void> => {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(until);
      await settle(() => s.state.pendingDecision === undefined);
    };

    await play("optionOne", () => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"));
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT1-013")).toHaveLength(1);
    await play("optionTwo", () => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT1-014")).toHaveLength(0);

    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await openMain(s, 0);
    await play("fund", () => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    await play("optionThree", () => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-014"));
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT1-014")).toHaveLength(1);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);
  });

  it("does not draw when the used Option costs less than 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "host", under: ["EX2-003"] }],
          hand: [{ card: "BT4-104", as: "option" }],
          deck: [{ card: "BT1-013", as: "notDrawn" }],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("does not react to a Security/Delay activation instead of using an Option (Q3270)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-021", as: "host", under: ["EX2-003"] },
            { card: "BT10-100", as: "delayed" },
          ],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: [{ card: "BT1-013", as: "notDrawn" }],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY, deck: FILLER_DECK },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.perm("delayed").placedByEffect = true;
    s.state.turnCount += 1;
    s.state.memory = 5;
    await s.ready();
    const activatable = observe(s.engine).activatableEffects(s.perm("delayed"));
    expect(activatable.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delayed").topCard!.instanceId,
        effectKey: activatable[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-100"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-013")).toBe(true);
  });

  it("uses the post-reduction use cost for the 2-or-more boundary (Q3271)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-021", as: "host", under: ["EX2-003"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [{ card: "BT8-097", as: "crimson" }],
          deck: [{ card: "BT1-013", as: "notDrawn" }],
          security: INERT_SECURITY,
        },
        1: {
          battleArea: Array.from({ length: 5 }, (_, index) => ({
            card: "EX2-014",
            as: `opponent${index}`,
            dp: 20_000,
          })),
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("still triggers when only the payment is reduced (Q5479/Q5480)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "host", under: ["EX2-003"] }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { security: INERT_SECURITY, deck: FILLER_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102")).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("triggers for an effect-driven free use while preserving the printed cost (Q5480)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-04", as: "host", under: ["EX2-003"] }],
          hand: [
            { card: "ST22-05", as: "sakuyamon" },
            { card: "ST22-10", as: "mandala" },
          ],
          deck: [
            { card: "BT1-013", as: "drawnByOption" },
            { card: "BT1-014", as: "drawnByViximon" },
          ],
          security: ["BT1-009"],
        },
        1: { security: INERT_SECURITY, deck: FILLER_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnByViximon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("mandala").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });
});
