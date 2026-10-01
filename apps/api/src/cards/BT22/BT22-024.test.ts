import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../BT21/BT21-031.js";
import "../P/P-104.js";
import "./BT22-086.js";
import { compiled } from "./BT22-024.js";

describe("BT22-024 MarineBullmon", () => {
  it("uses the Shellmon placement into Sangomon, fixed-cost hand digivolution, and self-stack inherited play", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: { nameOrTrait: [{ tokens: ["Yao Qinglan"], match: "nameExact" }] },
      },
    });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Shellmon"], match: "nameExact" }] },
        from: ["trash"],
        count: 1,
      },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Sangomon"], match: "nameExact" }] },
      position: "bottom",
      optional: true,
      bindHostAs: "marineBullmonHost",
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Digivolve",
      target: {
        fromSelectionRef: "marineBullmonHost",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Sangomon"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: 3,
      ignoreRequirements: true,
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "otherThanBattle",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "PlayWithoutCost",
                fromOwnDigivolutionStack: true,
                payCost: false,
                playedByDecode: true,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "eq", value: 4 },
                    nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                  },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      fromOwnDigivolutionStack: true,
      target: { source: "thisDigimon", filter: { levelComparison: { op: "lte", value: 4 } }, count: 1 },
      optional: true,
    });
  });

  it("places Shellmon from trash under the chosen Sangomon and evolves for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-022", as: "sangomon" },
            { card: "BT22-086", as: "yao" },
          ],
          hand: [{ card: "BT22-024", as: "marineBullmon" }],
          trash: [
            { card: "BT22-021", as: "shellmon" },
            { card: "BT22-020", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("sangomon").topCard?.cardId === "BT22-024");

    expect(s.state.memory).toBe(2);
    expect(s.perm("sangomon").topCard?.cardId).toBe("BT22-024");
    expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT22-021", "BT4-022"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
  });

  it("does not expose the hand effect without Yao Qinglan", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-031", as: "sangomon" }],
        hand: [{ card: "BT22-024", as: "marineBullmon" }],
        trash: ["BT22-021"],
      },
    });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT22-024/"),
    );

    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();
    expect(s.perm("sangomon").topCard?.cardId).toBe("BT21-031");
  });

  it("requires an exact Sangomon host and does not accept MoriShellmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-051", as: "moriShellmon" },
          { card: "BT22-086", as: "yao" },
        ],
        hand: [{ card: "BT22-024", as: "marineBullmon" }],
        trash: ["BT22-021"],
      },
    });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT22-024/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT22-024");
  });

  it("plays one eligible level-4 Aquatic source at end of attack only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-023",
              as: "host",
              under: ["BT22-021", "BT22-024"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT22-023",
      "BT22-021",
    ]);

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("executes Decode from its own stack on a non-battle leave", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-024", under: ["BT22-021"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-021"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT22-021"]);
  });
});

describe("BT22-024 MarineBullmon — KB Q&A rulings", () => {
  function handEffectKeyOf(s: ReturnType<typeof setupEngine>): { sourceInstanceId: string; effectKey: string } {
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT22-024/"),
    );
    expect(effect).toBeDefined();
    return { sourceInstanceId: source.instanceId, effectKey: effect!.effectKey };
  }

  it("reduces its fixed digivolution cost of 3 to 2 with BT21-031 Sangomon's reduction (Q4876)", async () => {
    async function memoryAfterHandDigivolve(sangomonCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: sangomonCardId, as: "sangomon" },
              { card: "BT22-086", as: "yao" },
            ],
            hand: [{ card: "BT22-024", as: "marineBullmon" }],
            trash: [{ card: "BT22-021", as: "shellmon" }],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;

      expect(s.engine.applyIntent(0, { type: "activateEffect", ...handEffectKeyOf(s) })).toEqual({ ok: true });
      await settle(() => s.perm("sangomon").topCard?.cardId === "BT22-024");
      await settle();

      expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT22-021", sangomonCardId]);
      return s.state.memory;
    }

    expect(await memoryAfterHandDigivolve("BT21-031")).toBe(3);
    // BT4-022 Sangomon has no cost reduction, so the fixed cost of 3 applies unchanged.
    expect(await memoryAfterHandDigivolve("BT4-022")).toBe(2);
  });

  it("cannot be activated while P-104 Mental Training's digivolve effect is resolving (Q4877)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-104", as: "training" },
          { card: "BT21-031", as: "sangomon" },
          { card: "BT22-086", as: "yao" },
        ],
        hand: [
          { card: "BT22-024", as: "marineBullmon" },
          { card: "BT22-022", as: "veedramon" },
        ],
        trash: [{ card: "BT22-021", as: "shellmon" }],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    s.state.memory = 10;
    s.state.turnCount = 1;
    await s.ready();
    const marineBullmonEffect = handEffectKeyOf(s);
    const delay = JSON.parse(s.perm("training").activatableEffectsJson) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("training").instanceId,
        effectKey: delay[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.pendingDecision).toBeDefined();

    expect(s.engine.applyIntent(0, { type: "activateEffect", ...marineBullmonEffect })).toEqual({
      ok: false,
      reason: "decision-pending",
    });
    await settle();
    expect(s.perm("sangomon").topCard?.cardId).toBe("BT21-031");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("shellmon").instanceId);

    const marineBullmonId = s.inst("marineBullmon").instanceId;
    while (s.state.pendingDecision !== undefined) {
      const pending = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
      const candidates = pending.options?.candidateInstanceIds ?? [];
      const pick = candidates.includes(marineBullmonId) ? [marineBullmonId] : candidates.slice(0, 1);
      const response =
        pending.kind === "optional"
          ? { kind: "optional" as const, accept: true }
          : pending.kind === "chooseTargets"
            ? { kind: "chooseTargets" as const, instanceIds: pick }
            : { kind: "selectCards" as const, instanceIds: pick };
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
        ok: true,
      });
      await settle();
    }

    expect(s.perm("sangomon").topCard?.cardId).toBe("BT22-022");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("marineBullmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("shellmon").instanceId);
  });
});
