import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-046.js";
import "../BT3/BT3-061.js";
import "../BT3/BT3-077.js";
import "../ST1/ST1-09.js";
import "./BT1-021.js";
import "./BT1-084.js";
import "./BT1-114.js";

describe("BT1-021 MetalGreymon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.events.some((event) => event.kind === "memoryChanged" && event.to === 3)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("loses the 3 gained memory at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("still pays the delayed 3 memory after being deleted by the security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker", dp: 7000 }],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
      1: { security: ["BT1-025"], deck: ["BT1-014"], hand: ["BT1-014"] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 3 && !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("passes at 3 memory and then pays the delayed loss at the real end of turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker" }],
        deck: ["BT1-014"],
        hand: ["BT1-009"],
      },
      1: { security: ["BT1-010"], deck: ["BT1-014"] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[1]!.security.length === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.memory).toBe(-6);
  });

  it("triggers after evolving onto a red level 4 and keeps its delayed loss", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "BT1-021", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-010"] },
    });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[1]!.security.length === 0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("still loses 3 at turn end when Terriermon prevents the Digimon memory gain", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "attacker" }],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT3-046", as: "terriermon" }],
        security: ["BT1-014"],
        deck: ["BT1-014"],
        hand: ["BT1-014"],
      },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;

    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("rejects evolution from a green level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "base" }], hand: [{ card: "BT1-021", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

type Setup = ReturnType<typeof setupEngine>;

function openMainPhase(s: Setup) {
  return (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
}

function memoryValuesAfter(s: Setup, eventIndex: number) {
  return s.events
    .slice(eventIndex)
    .filter((event) => event.kind === "memoryChanged")
    .map((event) => (event as { to: number }).to);
}

async function attackWithMemoryGainBlocker(blocker: string | null) {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-021", as: "attacker" }], deck: ["BT1-014"], hand: ["BT1-014"] },
    1: {
      battleArea: blocker ? [{ card: blocker, as: "blocker" }] : [],
      security: ["BT1-014"],
      deck: ["BT1-014"],
      hand: ["BT1-014"],
    },
  });
  const turn = s.engine.runOneTurn();
  await settle(() => openMainPhase(s).isOpen);
  s.state.memory = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0);
  const memoryAfterAttack = s.state.memory;
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
  return { memoryAfterAttack, memoryAtTurnEnd: s.state.memory };
}

describe("BT1-021 MetalGreymon — KB Q&A rulings", () => {
  it("still loses 3 memory at end of turn after being deleted by the attack it gained memory from (Q882)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "attacker", dp: 7000 }], deck: ["BT1-014"], hand: ["BT1-014"] },
      1: { security: ["BT1-025"], deck: ["BT1-014"], hand: ["BT1-014"] },
    });
    const turn = s.engine.runOneTurn();
    await settle(() => openMainPhase(s).isOpen);
    s.state.memory = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 3 && !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-021")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("passing at 3 memory moves the counter to 3 on the opponent's side, then the delayed loss moves it to 6 (Q883)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "attacker" }], deck: ["BT1-014"], hand: ["BT1-009"] },
      1: { security: ["BT1-010"], deck: ["BT1-014"] },
    });
    const turn = s.engine.runOneTurn();
    await settle(() => openMainPhase(s).isOpen);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[1]!.security.length === 0);

    const passEventIndex = s.events.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(memoryValuesAfter(s, passEventIndex).slice(0, 2)).toEqual([-3, -6]);
    expect(s.state.memory).toBe(-6);
  });

  it("an opposing Omnimon choosing ST1-09 MetalGreymon also deletes this MetalGreymon by shared name (Q942)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-021", as: "thisCard" },
            { card: "BT1-114", as: "secretRare" },
            { card: "ST1-09", as: "chosen" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("greymon").permanentId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST1-09", "BT1-021", "BT1-114"]),
    );
  });

  it("an opposing Terriermon stops the 3 memory gain but not the end-of-turn loss (Q1080)", async () => {
    expect(await attackWithMemoryGainBlocker(null)).toEqual({ memoryAfterAttack: 3, memoryAtTurnEnd: -6 });
    expect(await attackWithMemoryGainBlocker("BT3-046")).toEqual({ memoryAfterAttack: 0, memoryAtTurnEnd: -6 });
  });

  it("an opposing Chuumon stops the 3 memory gain but not the end-of-turn loss (Q1087)", async () => {
    expect(await attackWithMemoryGainBlocker(null)).toEqual({ memoryAfterAttack: 3, memoryAtTurnEnd: -6 });
    expect(await attackWithMemoryGainBlocker("BT3-061")).toEqual({ memoryAfterAttack: 0, memoryAtTurnEnd: -6 });
  });

  it("an opposing Gazimon stops the 3 memory gain but not the end-of-turn loss (Q1097)", async () => {
    expect(await attackWithMemoryGainBlocker(null)).toEqual({ memoryAfterAttack: 3, memoryAtTurnEnd: -6 });
    expect(await attackWithMemoryGainBlocker("BT3-077")).toEqual({ memoryAfterAttack: 0, memoryAtTurnEnd: -6 });
  });
});
