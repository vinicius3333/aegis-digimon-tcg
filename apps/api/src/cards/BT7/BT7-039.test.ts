import { EffectTiming, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-039.js";
import "./BT7-040.js";

describe("BT7-039 Stefilmon", () => {
  it("places up to 2 yellow level-4-or-lower Digimon under itself and draws per card placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-039", under: ["BT7-034"], as: "stefilmon" }],
          hand: ["BT1-048", "BT1-049"],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("stefilmon"));

    expect(s.perm("stefilmon").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("lets the UI choose which selected yellow card is the bottom source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-039",
              under: [{ card: "BT7-034", as: "existingSource" }],
              as: "stefilmon",
            },
          ],
          hand: [
            { card: "BT1-048", as: "firstYellow" },
            { card: "BT1-049", as: "secondYellow" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("stefilmon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    const selected = [s.inst("firstYellow").instanceId, s.inst("secondYellow").instanceId];
    expect(selection.options?.visibleCards).toEqual([
      { instanceId: selected[0]!, cardId: "BT1-048" },
      { instanceId: selected[1]!, cardId: "BT1-049" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: selected },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [selected[1]!, selected[0]!];
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: stackOrder },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("stefilmon").stack.map((card) => card.instanceId)).toEqual([
      ...stackOrder,
      s.inst("existingSource").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("gives one own Digimon Security Attack +1 after being trashed for Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-040", under: ["BT7-034", { card: "BT7-039", as: "stefilmon" }], as: "host" },
            { card: "BT1-010", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("stefilmon").instanceId);
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-040/"),
    )!.effectKey;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1 ||
        observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack") === 1,
    );

    expect(
      observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") +
        observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack"),
    ).toBe(1);
  });
});

describe("BT7-039 Stefilmon — KB Q&A rulings", () => {
  // Engine gap: the Digi-Burst trash fires onDigiBurstCardDiscarded watchers inline, so the
  // inherited effect resolves before the Digi-Burst's DP reduction is applied.
  it.fails("resolves the Digi-Burst effect before its own inherited trashed-by-Digi-Burst effect (Q1567)", async () => {
    const preferred: string[] = [];
    const targetDpWhenInheritedEffectStarts: number[] = [];
    let s: EngineSetup | undefined;
    const recordInheritedStart = (event: ServerEvent) => {
      if (s === undefined || event.kind !== "effectTriggered" || event.sourceCardId !== "BT7-039") return;
      targetDpWhenInheritedEffectStarts.push(s.perm("target").currentDP);
    };
    s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-040", under: ["BT7-034", { card: "BT7-039", as: "stefilmon" }], as: "host" },
            { card: "BT1-010", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, onEvent: recordInheritedStart },
    );
    const setup = s;
    preferred.push(setup.inst("stefilmon").instanceId);
    const source = observe(setup.engine).cardSource(setup.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-040/"),
    )!.effectKey;
    await setup.ready();
    const securityAttackGranted = () =>
      observe(setup.engine).keywordAmount(setup.perm("host"), "SecurityAttack") +
      observe(setup.engine).keywordAmount(setup.perm("ally"), "SecurityAttack");

    expect(
      setup.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: setup.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => securityAttackGranted() === 1 && setup.perm("target").currentDP < 12000);

    expect(setup.perm("target").currentDP).toBe(6000);
    expect(securityAttackGranted()).toBe(1);
    expect(targetDpWhenInheritedEffectStarts).toEqual([6000]);
  });
});
