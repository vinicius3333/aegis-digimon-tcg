import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT18-009.js";
import "../BT14/BT14-069.js";
import "../BT17/BT17-087.js";

describe("BT18-009 Shamanmon", () => {
  it("blocks opponent non-Tamer memory gain while preserving Tamer effects", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictMemoryGain", seat: "opponent", exceptTamerEffects: true, duration: "permanent" }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-009", as: "shamanmon" }] } });
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });

  it("blocks a natural opponent Digimon On Deletion memory gain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-009", as: "shamanmon" }],
          hand: [{ card: "BT18-008", as: "goblimon" }],
        },
        1: { battleArea: [{ card: "BT14-069", dp: 2000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.memory).toBe(7);
  });

  it("digivolves from a red level 2 for 0 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "egg" }],
        hand: [{ card: "BT18-009", as: "shamanmon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("shamanmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT18-009");
    expect(s.state.memory).toBe(2);
    expect(s.perm("egg").stack.at(-1)?.cardId).toBe("BT1-001");
  });
});

describe("BT18-009 Shamanmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

  function boardWithOpposingShamanmon(marcus: "inPlay" | "inHand") {
    return setupEngine(
      {
        0: {
          battleArea: [
            ...(marcus === "inPlay" ? [{ card: "BT17-087", as: "marcus" }] : []),
            { card: "BT17-052", as: "agumon" },
            { card: "BT1-012", as: "gazimonHost", under: ["BT14-069"] },
          ],
          hand: marcus === "inHand" ? [{ card: "BT17-087", as: "marcus" }] : [],
          deck: [...FILLER],
        },
        1: {
          battleArea: [
            { card: "BT18-009", as: "shamanmon" },
            { card: "BT1-012", as: "ownGazimonHost", under: ["BT14-069"] },
          ],
          deck: [...FILLER],
        },
      },
      { autoSelectCards: true },
    );
  }

  it("stops the opponent from gaining memory by Digimon effects but not by Tamer effects, and leaves its controller unaffected (Q2910)", async () => {
    const s = boardWithOpposingShamanmon("inPlay");
    s.state.memory = 0;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("gazimonHost").permanentId], "byEffect")).toBe(1);
    await drainMicrotasks();
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ownGazimonHost").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 0);
    expect(s.state.memory).toBe(0);
  });

  it("lets a Marcus Damon treated as both Digimon and Tamer gain memory by its suspend effect (Q2911)", async () => {
    const s = boardWithOpposingShamanmon("inHand");
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    expect(advance(s.engine).ledgers.continuous.grantedKinds(s.perm("marcus").permanentId)).toContain("Digimon");
    expect(s.state.memory).toBe(0);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("gazimonHost").permanentId], "byEffect")).toBe(1);
    await drainMicrotasks();
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(4000);
  });
});
