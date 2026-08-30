import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-059.js";
import "../BT17/BT17-079.js";
import "../BT18/BT18-032.js";
import "../BT1/BT1-053.js";
import "../EX3/EX3-045.js";

describe("BT18-059 Zenimon", () => {
  it("blocks opponent non-Tamer memory gain while preserving Tamer effects", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictMemoryGain", seat: "opponent", exceptTamerEffects: true, duration: "permanent" }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-059", as: "zenimon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    assertNoLoudGap(s);
  });

  it("lapses immediately when Zenimon leaves play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-059", suspended: true, as: "zenimon" }] },
      1: { battleArea: [{ card: "EX3-045", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("zenimon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);
    assertNoLoudGap(s);
  });

  it("blocks a natural non-Tamer memory effect while allowing a natural Tamer effect", async () => {
    const blocked = setupEngine({
      0: { battleArea: [{ card: "BT18-059", as: "zenimon" }] },
      1: {
        battleArea: [{ card: "BT18-032", as: "luxmon" }],
        hand: [{ card: "BT1-053", as: "angel" }],
      },
    });
    blocked.state.turnSeat = 1;
    blocked.state.memory = 10;
    await blocked.ready();
    expect(blocked.engine.applyIntent(1, { type: "playCard", instanceId: blocked.inst("angel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => blocked.state.players[1]!.battleArea.length === 2);
    expect(blocked.state.memory).toBe(6);
    expect(blocked.events.some((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toBe(false);

    const allowed = setupEngine({
      1: {
        battleArea: [{ card: "BT18-032", as: "luxmon" }],
        hand: [{ card: "BT1-053", as: "angel" }],
      },
    });
    allowed.state.turnSeat = 1;
    allowed.state.memory = 10;
    await allowed.ready();
    expect(allowed.engine.applyIntent(1, { type: "playCard", instanceId: allowed.inst("angel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => allowed.state.players[1]!.battleArea.length === 2);
    expect(allowed.state.memory).toBe(7);

    const tamer = setupEngine({
      0: { battleArea: [{ card: "BT18-059", as: "zenimon" }] },
      1: { battleArea: [{ card: "BT17-079", as: "takuya" }] },
    });
    tamer.state.turnSeat = 1;
    tamer.state.memory = 0;
    await tamer.ready();
    await advance(tamer.engine).runTurn(1);
    expect(
      tamer.events.some((event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to === 1),
    ).toBe(true);
    assertNoLoudGap(blocked);
    assertNoLoudGap(allowed);
    assertNoLoudGap(tamer);
  });

  it("digivolves from a black level 2 for zero and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-005", as: "egg" }],
        hand: [{ card: "BT18-059", as: "zenimon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("zenimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT18-059");

    expect(s.state.memory).toBe(2);
    expect(s.perm("egg").stack.at(-1)?.cardId).toBe("BT18-005");
    assertNoLoudGap(s);
  });
});
