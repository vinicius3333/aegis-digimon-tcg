import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-085.js";
import "./index.js";

const RIKA = "BT17-085";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = observe(s.engine).cardSource(s.perm("rika"));
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith(`${RIKA}/`));
  if (effect === undefined) throw new Error("BT17-085 exposes no Main effect");
  return effect.effectKey;
}

describe("BT17-085 Rika Nonaka", () => {
  it("matches the immutable catalog identity and all printed clauses", () => {
    expect(getCardDefinition(RIKA)).toMatchObject({
      nameEn: "Rika Nonaka",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      effectText: expect.stringContaining("one of your [Renamon]"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("traces the start-memory, bound three-card placement, Sakuyamon evolution, and Security IR", () => {
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual(["StartOfYourMainPhase", "Main", "Security"]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "compound",
            costs: [
              { kind: "place", targetIsPermanent: true, bindHostAs: "rikaTarget" },
              { kind: "place", host: { filter: { boundRef: "rikaTarget" } } },
              { kind: "place", host: { filter: { boundRef: "rikaTarget" } } },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { fromSelectionRef: "rikaTarget" },
              into: { nameOrTrait: [{ tokens: ["Sakuyamon"], match: "name" }] },
              from: ["hand"],
              payCost: true,
              costOverride: 4,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
        { kind: "Return", condition: { kind: "ifThisEffectDigivolved" }, to: "hand" },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally gains memory at the start of the main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: RIKA, as: "rika" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("naturally places this Tamer and both Trash materials under one Renamon, then optionally evolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RIKA, as: "rika" }, { card: "BT17-031", as: "renamon" }],
          hand: [{ card: "BT17-038", as: "sakuyamon" }],
          trash: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-097", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rika").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").topCard?.cardId === "BT17-038");

    expect(s.perm("renamon").topCard?.cardId).toBe("BT17-038");
    expect(s.perm("renamon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([RIKA, "BT17-032", "BT17-035"]),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("honors declining the optional Sakuyamon evolution after paying and placing all materials", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: RIKA, as: "rika" }, { card: "BT17-031", as: "renamon" }],
        hand: [{ card: "BT17-038", as: "sakuyamon" }],
        trash: [{ card: "BT17-032", as: "kyubimon" }, { card: "BT17-035", as: "taomon" }],
      },
    });
    s.state.memory = 4;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rika").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const activation = s.decisions.findLast(({ req }) => req.kind === "optional")!;
    expect(
      s.engine.applyIntent(activation.seat, {
        type: "respondDecision",
        decisionId: activation.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const evolution = s.decisions.findLast(({ req }) => req.kind === "optional")!;
    expect(
      s.engine.applyIntent(evolution.seat, {
        type: "respondDecision",
        decisionId: evolution.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").stack.length === 3);

    expect(s.perm("renamon").topCard?.cardId).toBe("BT17-031");
    expect(s.perm("renamon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([RIKA, "BT17-032", "BT17-035"]),
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-038")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not treat Kuzuhamon as Sakuyamon for the named evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: RIKA, as: "rika" }, { card: "BT17-031", as: "renamon" }],
        hand: [{ card: "EX4-030", as: "kuzuhamon" }],
        trash: [{ card: "BT17-032", as: "kyubimon" }, { card: "BT17-035", as: "taomon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("rika").topCard.instanceId,
      effectKey: mainEffectKey(s),
    }).ok).toBe(false);
    expect(s.perm("renamon").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: RIKA, as: "securityRika" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityRika").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
