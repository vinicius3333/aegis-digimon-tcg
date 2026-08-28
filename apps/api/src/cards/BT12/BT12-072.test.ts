import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT11/BT11-072.js";
import "../EX3/EX3-013.js";
import "./BT12-072.js";

describe("BT12-072 Chaosdramon (X Antibody)", () => {
  it.each([
    ["EX3-013", "Chaosdramon"],
    ["BT11-072", "Machinedramon"],
  ])("digivolves for 2 from %s (%s) through the public intent", async (base, name) => {
    expect(digivolutionRequirementsFor("BT12-072")).toContainEqual({
      names: [name],
      cost: 2,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT12-072", as: "chaosX" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-072");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(base);
  });

  it("rejects the alternate route from an unrelated same-level Digimon", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-070", as: "war" }], hand: [{ card: "BT12-072", as: "chaosX" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("war").permanentId,
        instanceId: s.inst("chaosX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("immediately gains and activates Chaosdramon's When Digivolving effect (Q2213)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-013", as: "chaos" }],
          hand: [
            { card: "BT12-072", as: "chaosX" },
            { card: "BT9-065", as: "cyborg" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-025", as: "target", under: ["BT1-015"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: s.inst("chaosX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-015");
    expect(s.perm("chaos").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborg").instanceId);
    expect(s.perm("target").topCard.cardId).toBe("BT1-015");
  });

  it("places a Cyborg from trash at the bottom of its stack at start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-072", as: "chaos", under: ["BT1-009"] }],
          trash: [{ card: "BT1-021", as: "cyborg" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("chaos"));
    expect(s.perm("chaos").stack[0]?.cardId).toBe("BT1-021");
  });

  it("trashes the top opposing security when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-072", as: "chaos" }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    const topSecurityId = s.state.players[1]!.security[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId]);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(topSecurityId);
  });

  it("retains Machinedramon's gained On Deletion effect through deletion (Q2214)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-072", as: "chaosX", under: ["BT11-072"] },
            { card: "BT11-092", as: "analogman" },
          ],
          hand: [{ card: "BT11-072", as: "machinedramon" }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const analogId = s.inst("analogman").instanceId;
    const replacementId = s.inst("machinedramon").instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("chaosX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT11-072"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(replacementId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(analogId);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash security when another own Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-072", as: "chaos" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
