import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-026.js";

function evolutionEffectKey(s: EngineSetup): string {
  const source = (s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }).cardSourceOf(s.inst("lopmon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-026/"))!
    .effectKey;
}

describe("BT23-026 Lopmon", () => {
  it("during your turn may digivolve this Digimon into Antylamon for 3 with Makiko Date", () => {
    expect(getCardDefinition("BT23-026")).toMatchObject({
      cardId: "BT23-026",
      nameEn: "Lopmon",
      colors: ["Yellow", "Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast", "CS"],
    });
    const action = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Antylamon"], match: "name" }] },
      payCost: true,
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      condition: {
        kind: "youHave",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Makiko Date"], match: "name" }] },
      },
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("digivolves into Antylamon for exactly 3 while Makiko Date is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-026", as: "lopmon" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [{ card: "BT23-029", as: "antylamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("lopmon").instanceId,
        effectKey: evolutionEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.instanceId === s.inst("antylamon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("inherits a once-per-turn -2000 DP reaction only for another friendly suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-029", as: "carrier", under: ["BT23-026"] },
            { card: "BT23-017", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT23-018", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const base = s.perm("target").currentDP;
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("carrier").permanentId });
    expect(s.perm("target").currentDP).toBe(base);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.perm("target").currentDP).toBe(base - 2000);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.perm("target").currentDP).toBe(base - 2000);
  });
});
