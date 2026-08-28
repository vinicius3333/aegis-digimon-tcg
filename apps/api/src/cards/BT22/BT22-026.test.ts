import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-026.js";

describe("BT22-026 MetalGarurumon", () => {
  it("keeps the Nokia hand digivolution, modal When Digivolving options, and inherited Omnimon unsuspend", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true });
    expect(main?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Gabumon"], match: "name" }],
        },
        count: 1,
      },
      into: { isSelfRef: true },
      costOverride: 6,
      payCost: true,
      ignoreRequirements: true,
      condition: { kind: "youHave" },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "Digivolve",
            target: {
              filter: { controller: "mine", zone: "battleArea", nameOrTrait: [{ tokens: ["Agumon"], match: "name" }] },
              count: 1,
            },
            into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["WarGreymon"], match: "name" }] },
            from: ["hand"],
            payCost: false,
            ignoreRequirements: true,
            optional: true,
          },
        ],
        [
          {
            kind: "Return",
            to: "hand",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          },
        ],
      ],
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, isSelf: true },
          // Structured, not "raw": evaluateCondition treats an unparsed gate as unmet, so a raw
          // kind here would silently never unsuspend.
          condition: { kind: "selfHasNameContaining" },
        },
      ],
    });
  });

  it("evolves Gabumon from hand for exactly 6 when Nokia is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-017", as: "gabumon" },
          { card: "BT22-084", as: "nokia" },
        ],
        hand: [{ card: "BT22-026", as: "metalGarurumon" }],
      },
    });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("metalGarurumon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("gabumon").topCard?.cardId === "BT22-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("gabumon").stack.some((card) => card.cardId === "BT22-017")).toBe(true);
  });

  it("optionally evolves Agumon into WarGreymon for free while ignoring requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-026", as: "metalGarurumon" },
            { card: "BT22-008", as: "agumon" },
          ],
          hand: [
            { card: "BT22-013", as: "warGreymon" },
            { card: "BT22-025", as: "invalid" },
          ],
        },
      },
      { preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("metalGarurumon"));
    await settle(() => s.perm("agumon").topCard?.cardId === "BT22-013");

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
  });

  it("returns one lowest-level opponent Digimon to hand through the other mode", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-026", as: "metalGarurumon" }] },
        1: {
          battleArea: [
            { card: "BT22-022", as: "lowest" },
            { card: "BT22-023", as: "higher" },
          ],
        },
      },
      { preferOptionIndex: 1, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("metalGarurumon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lowest").instanceId]);
  });

  it("unsuspends an Omnimon inherited host when attacking only once per turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-015", under: ["BT22-026"], as: "omnimon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("omnimon").isSuspended);
    expect(s.perm("omnimon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("omnimon").isSuspended);
    expect(s.perm("omnimon").isSuspended).toBe(true);
  });
});
