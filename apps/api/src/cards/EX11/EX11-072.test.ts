import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-072.js";

describe("EX11-072 Unique Emblem: Guardian Vortex", () => {
  it("preserves the printed Option and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-072")).toMatchObject({
      nameEn: "Unique Emblem: Guardian Vortex",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Vortex Warriors", "LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("requires both Bird Dragon and LIBERATOR on the Delay digivolution target", () => {
    const delay = compiled.effects?.find(
      (effect) => effect.trigger === "Main" && effect.keywords?.some(({ keyword }) => keyword === "Delay"),
    );
    expect(irNode(delay?.actions?.[0])?.into?.nameOrTrait?.[0]).toMatchObject({
      match: "traitAll",
      tokens: ["Bird Dragon", "LIBERATOR"],
    });
  });

  it("security activates Main, plays a named card, and places the emblem in battle", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX11-072", as: "emblem", faceUp: true }],
          hand: [{ card: "EX11-026", as: "pteromon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX11-026", "EX11-072"]),
    );
    assertNoLoudGap(s);
  });

  it("arms Delay when Shoto suspends, then trashes the emblem to evolve a legal stack for cost 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-028", as: "bird" },
          ],
          hand: [
            { card: "EX11-072", as: "emblem" },
            { card: "EX11-032", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("emblem").instanceId);
    s.perm("emblem").enterFieldTurnCount = 4294967295;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    expect(observe(s.engine).hasKeyword(s.perm("emblem"), "Delay")).toBe(true);

    const source = s.inst("emblem");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source))[0]!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("bird").topCard.cardId === "EX11-032");

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-072");
    assertNoLoudGap(s);
  });

  it("publishes a separate Delay grant and paid reduced-cost payload", () => {
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(watcher.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "GainKeyword" }] },
    ]);
    const delay = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.keywords?.some(({ keyword }) => keyword === "Delay"),
    )!;
    expect(delay.actions).toMatchObject([
      {
        kind: "Digivolve",
        target: { filter: { nameOrTrait: [{ match: "traitContains" }, { match: "trait" }] } },
        payCost: true,
        reduceCost: 3,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
