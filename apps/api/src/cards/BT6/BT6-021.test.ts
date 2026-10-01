import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-021.js";
import "../ST2/ST2-13.js";
import "../BT1/BT1-021.js";

describe("BT6-021 ModokiBetamon", () => {
  it("blocks opponent memory gain except from Tamer effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-021", as: "modoki" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});

type Setup = ReturnType<typeof setupEngine>;

function openMainPhase(s: Setup) {
  return (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
}

async function attackWithMetalGreymon(opponentHasModokiBetamon: boolean) {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-021", as: "attacker" }], deck: ["BT1-014"], hand: ["BT1-014"] },
    1: {
      battleArea: opponentHasModokiBetamon ? [{ card: "BT6-021" }] : [],
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

async function checkHammerSparkSecurity(attackerHasModokiBetamon: boolean) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-014", as: "attacker" }, ...(attackerHasModokiBetamon ? [{ card: "BT6-021" }] : [])],
    },
    1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
  });
  s.state.memory = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("hammerSpark").instanceId));
  await settle();
  return s.state.memory;
}

describe("BT6-021 ModokiBetamon — KB Q&A rulings", () => {
  it("stops the opponent's memory gain from an effect but not that effect's end-of-turn memory loss (Q1415)", async () => {
    expect(await attackWithMetalGreymon(false)).toEqual({ memoryAfterAttack: 3, memoryAtTurnEnd: -6 });
    expect(await attackWithMetalGreymon(true)).toEqual({ memoryAfterAttack: 0, memoryAtTurnEnd: -6 });
  });

  it("stops the opponent from gaining memory with the [Security] effect of Hammer Spark (Q1416)", async () => {
    expect(await checkHammerSparkSecurity(false)).toBe(-2);
    expect(await checkHammerSparkSecurity(true)).toBe(0);
  });
});
