import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./BT11-093.js";

describe("BT11-093 Yuuya Kuga", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-093")).toMatchObject({
      cardId: "BT11-093",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("has complete registered IR coverage", () => {
    const registered = runtimeCompiledCard("BT11-093")!;
    expect(registered.coverage).toBe("full");
    expect(registered.residual).toHaveLength(0);
  });

  it("[Start of Your Turn] sets memory to 3 when memory <= 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-093", dp: 0 }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
          hand: ["AD1-001"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 1;
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    expect(s.state.memory).toBe(3);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("[Your Turn] when a Greymon-named Digimon digivolves, Yuuya suspends and grants +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", dp: 0, as: "yuuyaPerm" },
            { card: "ST15-11", dp: 8000, as: "metalGreymon" },
          ],
          deck: ["BT1-009"],
          hand: [{ card: "BT2-065", as: "warGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yuuyaPerm = s.perm("yuuyaPerm");
    const metalGreymon = s.perm("metalGreymon");
    const warGreymon = s.inst("warGreymon");
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: metalGreymon.permanentId,
      instanceId: warGreymon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    await settle(() => yuuyaPerm.isSuspended && metalGreymon.currentDP > 11000);

    expect(yuuyaPerm.isSuspended).toBe(true);
    expect(metalGreymon.currentDP).toBe(13000);
  });

  it("grants opponent Option immunity after a same-level Greymon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", as: "yuuya" },
            { card: "BT5-010", as: "greymon" },
          ],
          hand: [{ card: "BT11-064", as: "greymonX" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("greymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("yuuya").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option"),
    );

    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option")).toBe(true);
  });
});

const FILLER_DECK = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

function digivolveIntoGreymonX(s: EngineSetup, seat: 0 | 1): void {
  expect(
    s.engine.applyIntent(seat, {
      type: "digivolve",
      permanentId: s.perm("greymon").permanentId,
      instanceId: s.inst("greymonX").instanceId,
    }),
  ).toEqual({ ok: true });
}

function isOptionImmune(s: EngineSetup, alias: string): boolean {
  return observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Option");
}

function memoryLossOf(s: EngineSetup, before: number): boolean {
  return s.events.some((event) => event.kind === "memoryChanged" && event.from === before && event.to === before - 2);
}

async function memoryLostAttackingWithGreymonXAfterIceWall({ withYuuya }: { withYuuya: boolean }): Promise<number> {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "EX1-068", as: "iceWall" }],
        battleArea: [{ card: "AD1-006", as: "blueSource" }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
        deck: FILLER_DECK,
      },
      1: {
        hand: [{ card: "BT11-064", as: "greymonX" }],
        battleArea: [...(withYuuya ? [{ card: "BT11-093", as: "yuuya" }] : []), { card: "BT5-010", as: "greymon" }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
        deck: FILLER_DECK,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);

  digivolveIntoGreymonX(s, 1);
  await settle(() => s.perm("greymon").topCard.cardId === "BT11-064" && (!withYuuya || isOptionImmune(s, "greymon")));
  await advance(s.engine).waitForMainPhase(1);
  expect(isOptionImmune(s, "greymon")).toBe(withYuuya);

  const before = s.state.memory;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("greymon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.security.length === 2);
  await advance(s.engine).waitForMainPhase(1);
  const memoryLost = memoryLossOf(s, before) ? 2 : 0;

  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return memoryLost;
}

async function greymonXSurvivesGaiaForceSecurity({ withYuuya }: { withYuuya: boolean }): Promise<boolean> {
  const s = setupEngine(
    {
      0: {
        battleArea: [...(withYuuya ? [{ card: "BT11-093", as: "yuuya" }] : []), { card: "BT5-010", as: "greymon" }],
        hand: [{ card: "BT11-064", as: "greymonX" }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
        deck: FILLER_DECK,
      },
      1: {
        security: [{ card: "ST1-16", as: "gaiaForce" }, "BT1-009"],
        deck: FILLER_DECK,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);

  digivolveIntoGreymonX(s, 0);
  await settle(() => s.perm("greymon").topCard.cardId === "BT11-064" && (!withYuuya || isOptionImmune(s, "greymon")));
  await advance(s.engine).waitForMainPhase(0);
  expect(isOptionImmune(s, "greymon")).toBe(withYuuya);
  const greymonId = s.perm("greymon").permanentId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: greymonId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "ST1-16"));
  await advance(s.engine).waitForMainPhase(0);
  const survived = s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === greymonId);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return survived;
}

describe("BT11-093 Yuuya Kuga — KB Q&A rulings", () => {
  it("keeps the immune Digimon safe from the [Security] effect of an opponent's Option card (Q2119)", async () => {
    expect(await greymonXSurvivesGaiaForceSecurity({ withYuuya: false })).toBe(false);
    expect(await greymonXSurvivesGaiaForceSecurity({ withYuuya: true })).toBe(true);
  });

  it("lets Ice Wall affect the Digimon once the Option immunity expires on the next turn (Q2120)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", as: "yuuya" },
            { card: "BT5-010", as: "greymon" },
          ],
          hand: [{ card: "BT11-064", as: "greymonX" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: FILLER_DECK,
        },
        1: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: FILLER_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    digivolveIntoGreymonX(s, 0);
    await settle(() => s.perm("yuuya").isSuspended && isOptionImmune(s, "greymon"));
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX1-068"));
    await advance(s.engine).waitForMainPhase(1);
    expect(isOptionImmune(s, "greymon")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(isOptionImmune(s, "greymon")).toBe(false);
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => memoryLossOf(s, before));
    expect(memoryLossOf(s, before)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ends Ice Wall's granted memory loss when the Digimon becomes immune to Option cards (Q2121)", async () => {
    expect(await memoryLostAttackingWithGreymonXAfterIceWall({ withYuuya: false })).toBe(2);
    expect(await memoryLostAttackingWithGreymonXAfterIceWall({ withYuuya: true })).toBe(0);
  });
});
