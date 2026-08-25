import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-081.js";

function fireOnPlay(s: ReturnType<typeof setupEngine>): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("chitose").permanentId });
}

describe("BT23-081 Chitose Imai", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-081")).toMatchObject({
      cardId: "BT23-081",
      nameEn: "Chitose Imai",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains start-main memory only while its controller has a CS Digimon", async () => {
    const withCs = setupEngine({ 0: { battleArea: ["BT23-081", "BT23-006"] } });
    await (withCs.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(withCs.state.memory).toBe(1);

    const withoutCs = setupEngine({ 0: { battleArea: ["BT23-081"] } });
    await (withoutCs.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(withoutCs.state.memory).toBe(0);
  });

  it("plays exactly a cost-5-or-lower Hudie Digimon from a mixed hand without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-081", as: "chitose" }],
          hand: [
            { card: "BT23-020", as: "hudie" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hudieId = s.inst("hudie").instanceId;
    const plainId = s.inst("plain").instanceId;

    await fireOnPlay(s);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === hudieId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("may decline the free play and leave the eligible Hudie in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-081", as: "chitose" }],
          hand: [{ card: "BT23-020", as: "hudie" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hudieId = s.inst("hudie").instanceId;
    await fireOnPlay(s);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === hudieId)).toBe(true);
  });

  it("plays a Hudie Digimon with play cost 5 or less on play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: { filter: { kind: ["Digimon"], playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
  });

  it("does not suspend or reduce DP for a non-Hudie suspension subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT1-009", as: "plain" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("plain").permanentId,
    });
    expect(s.perm("chitose").isSuspended).toBe(false);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("pays by suspending this Tamer to reduce an opponent Digimon by 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-017", as: "hudie" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("hudie").permanentId,
    });
    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(0);
  });
});
