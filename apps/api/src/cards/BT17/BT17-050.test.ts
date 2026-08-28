import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-050.js";
import "./index.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT17-050/"),
  );
  if (effect === undefined) throw new Error("BT17-050 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT17-050 Parasitemon", () => {
  it("matches the catalog identity and printed evolution route", () => {
    expect(getCardDefinition("BT17-050")).toMatchObject({
      cardId: "BT17-050",
      colors: ["Green"],
      level: 6,
      playCost: 9,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
    });
  });

  it("pays 4 to place itself under a level-5-or-higher Digimon, then suspends and attacks", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect).toMatchObject({
      isFromHand: true,
      actions: [{ kind: "Modal", choose: 1, cost: { kind: "payMemory", memory: 4 } }],
    });
    const option = irNode(effect!.actions[0]!).options[0];
    expect(option).toHaveLength(3);
    expect(option[0]).toMatchObject({
      kind: "PlaceUnder",
      underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
    });
    expect(option[1]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(option[2]).toMatchObject({ kind: "Attack", attacker: { filter: { boundRef: "parasitemonHost" } } });
  });

  it("places itself under another Digimon after attacking and carries the inherited deletion/DP effects", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfAttack")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      underFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
      optional: true,
    });
    expect(compiled.effects.filter((entry) => entry.isInherited).map((entry) => entry.trigger)).toEqual([
      "AllTurns",
      "YourTurn",
    ]);
  });

  it("naturally pays 4 from hand, places itself, suspends, and attacks with the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-048", as: "host" }],
          hand: [{ card: "BT17-050", as: "parasitemon" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const parasitemonId = s.inst("parasitemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: parasitemonId,
        effectKey: handMainEffectKey(s, s.inst("parasitemon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some(({ instanceId }) => instanceId === parasitemonId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === parasitemonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.perm("host").currentDP).toBe(10000);
  });
});
