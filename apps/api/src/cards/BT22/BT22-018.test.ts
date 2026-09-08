import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-018.js";

describe("BT22-018 Sangomon", () => {
  it("places itself under an Aqua/Sea Animal Digimon and grants temporary protection", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions).toHaveLength(2);
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      duration: "untilOpponentTurnEnd",
      target: { filter: { boundRef: "sangomonHost" } },
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
        targetIsPermanent: true,
        bindHostAs: "sangomonHost",
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(onPlay?.actions[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "sangomonHost" } },
      restriction: "beDeletedInBattle",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });

  it("places itself only under an eligible peer and grants that host both protections", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-018", as: "sangomon" },
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("seaAnimal").permanentId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sangomon"));

    expect(s.perm("seaAnimal").stack.some((card) => card.cardId === "BT22-018")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("seaAnimal"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("seaAnimal"), "Jamming")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("seaAnimal"), "beDeletedInBattle")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
  });

  it("places under a natural Aquabeast peer, while rejecting an opponent's eligible host", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-018", as: "sangomon" }],
          battleArea: [{ card: "BT10-023", as: "aquabeast" }],
        },
        1: { battleArea: [{ card: "BT10-023", as: "opponentAquabeast" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("aquabeast").stack.some((card) => card.instanceId === s.inst("sangomon").instanceId));
    expect(s.perm("aquabeast").stack.some((card) => card.instanceId === s.inst("sangomon").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.stack.some((card) => card.cardId === "BT22-018")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("aquabeast"), "Blocker")).toBe(true);
  });
});
