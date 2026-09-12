import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-085.js";
import { cite } from "../../engine/conformance/_kb.js";
import "./index.js";

const RIKA = "BT17-085";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = observe(s.engine).cardSource(s.perm("rika"));
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith(`${RIKA}/`));
  if (effect === undefined) throw new Error("BT17-085 exposes no Main effect");
  return effect.effectKey;
}

describe("BT17-085 Rika Nonaka", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0034",
      "Bracket-only Renamon, Kyubimon and Taomon references require exact names",
      "c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2",
    );
  });
  it("refuses Renamon X Antibody as the sole placement host before removing the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RIKA, as: "rika" },
            { card: "EX8-031", as: "nearHost" },
          ],
          trash: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-035", as: "taomon" },
          ],
          hand: [{ card: "BT17-038", as: "destination" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const rikaId = s.perm("rika").topCard.instanceId;
    const materials = [s.inst("kyubimon").instanceId, s.inst("taomon").instanceId];
    const destinationId = s.inst("destination").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: rikaId, effectKey: mainEffectKey(s) }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === rikaId)).toBe(true);
    expect(s.perm("nearHost").stack).toHaveLength(0);
    expect(s.perm("nearHost").topCard.cardId).toBe("EX8-031");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(materials);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(destinationId);
    expect(s.state.memory).toBe(4);
  });
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
              into: { nameOrTrait: [{ tokens: ["Sakuyamon"], match: "nameExact" }] },
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

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "memoryChanged", from: 0, to: 1 }));
    assertNoLoudGap(s);
  });

  it("naturally places this Tamer and both Trash materials under one Renamon, then optionally evolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RIKA, as: "rika" },
            { card: "BT17-031", as: "renamon" },
            { card: "BT17-031", as: "otherRenamon" },
            { card: "EX8-031", as: "nearHost" },
          ],
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
    expect(s.perm("nearHost").topCard.cardId).toBe("EX8-031");
    expect(s.perm("nearHost").stack).toHaveLength(0);
    expect(s.perm("otherRenamon").topCard.cardId).toBe("BT17-031");
    expect(s.perm("otherRenamon").stack).toHaveLength(0);
    const hostChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === RIKA);
    expect(hostChoice?.req.options?.candidateInstanceIds).toEqual([
      s.perm("renamon").permanentId,
      s.perm("otherRenamon").permanentId,
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("honors declining the optional Sakuyamon evolution after paying and placing all materials", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: RIKA, as: "rika" },
          { card: "BT17-031", as: "renamon" },
        ],
        hand: [{ card: "BT17-038", as: "sakuyamon" }],
        trash: [
          { card: "BT17-032", as: "kyubimon" },
          { card: "BT17-035", as: "taomon" },
        ],
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

  it("does not treat an unrelated Digimon as Sakuyamon for the named evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RIKA, as: "rika" },
            { card: "BT17-031", as: "renamon" },
          ],
          hand: [{ card: "BT17-016", as: "unrelated" }],
          trash: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-035", as: "taomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    // CR 15-7-5 permits the payable placements even without a legal
    // evolution destination; exact destination matching still prevents evolution.
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rika").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }).ok,
    ).toBe(true);
    await settle(() => s.state.pendingDecision === undefined && s.perm("renamon").stack.length === 3);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("renamon").topCard.cardId).toBe("BT17-031");
    expect(s.perm("renamon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining([RIKA, "BT17-032", "BT17-035"]),
    );
    expect(s.perm("renamon").stack).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === RIKA)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-016")).toBe(true);
    assertNoLoudGap(s);
  });

  // Q2868 excludes Kuzuhamon from exact Sakuyamon evolution; it does not
  // prohibit paying the independent placements under CR 15-7-5.
  it("Q2868: pays placements but does not evolve into Kuzuhamon as exact Sakuyamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RIKA, as: "rika" },
            { card: "BT17-031", as: "renamon" },
          ],
          hand: [{ card: "EX4-030", as: "kuzuhamon" }],
          trash: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-035", as: "taomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(getCardDefinition("EX4-030")).toMatchObject({
      nameEn: "Kuzuhamon",
      effectText: expect.stringContaining("also treated as having [Sakuyamon] in its name"),
    });
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rika").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }).ok,
    ).toBe(true);
    await settle(() => s.state.pendingDecision === undefined && s.perm("renamon").stack.length === 3);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("renamon").topCard.cardId).toBe("BT17-031");
    expect(s.perm("renamon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining([RIKA, "BT17-032", "BT17-035"]),
    );
    expect(s.perm("renamon").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-030"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === RIKA)).toBe(false);
    expect(s.state.memory).toBe(4);
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
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
