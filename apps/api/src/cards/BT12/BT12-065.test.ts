import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT12-065.js";

describe("BT12-065 Sephirothmon", () => {
  it("compiles the delayed forced attack as a targeted start-of-main sub-trigger", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "startOfYourMainPhase",
      on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      duration: "untilOpponentTurnEnd",
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });

  it("grants one opposing Digimon a delayed attack rather than attacking immediately", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-065", as: "sephiroth" },
            { card: "BT1-009", as: "sink", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "grantee" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sephiroth"));
    expect(s.perm("grantee").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => s.perm("grantee").isSuspended);
    expect(s.perm("grantee").isSuspended).toBe(true);
  });

  it("digivolves for 1 from Mercurymon through the public intent", async () => {
    expect(digivolutionRequirementsFor("BT12-065")).toContainEqual({
      names: ["Mercurymon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-066", as: "mercury" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mercury").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mercury").topCard.cardId === "BT12-065");
    expect(s.state.memory).toBe(0);
    expect(s.perm("mercury").stack.map(({ cardId }) => cardId)).toEqual(["BT12-066"]);
  });

  it("digivolves onto a black Tamer as a level-3 black Digimon for the printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-094", as: "blackTamer" }],
        hand: [{ card: "BT12-065", as: "sephiroth" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackTamer").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackTamer").topCard.cardId === "BT12-065");
    expect(s.state.memory).toBe(0);
    expect(s.perm("blackTamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
  });

  it("rejects the Tamer evolution route from a non-black Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "blueTamer" }], hand: [{ card: "BT12-065", as: "sephiroth" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("sephiroth").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
