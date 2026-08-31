import { describe, expect, it } from "vitest";
import { type PlayerState, EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT5-092.js";

type ActivatableEffect = { effectKey: string };

function activatableEffects(s: ReturnType<typeof setupEngine>, alias: string): ActivatableEffect[] {
  return observe(s.engine).activatableEffects(s.perm(alias)) as ActivatableEffect[];
}

describe("BT5-092 Nokia Shiramine", () => {
  it("may play exactly one literally named Agumon or Gabumon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT5-092", as: "source" },
            { card: "BT5-007", as: "agumon" },
            { card: "BT6-018", as: "agumonVariant" },
            { card: "BT5-072", as: "fakeAgumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === agumonId));
    expect(s.state.memory).toBe(0);
    expect(player.hand.some((card) => card.instanceId === s.inst("agumonVariant").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("fakeAgumon").instanceId)).toBe(true);
    expect(player.battleArea.filter((p) => p.topCard?.cardId !== "BT5-092")).toHaveLength(1);
  });

  it("also accepts the literally named Gabumon branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT5-092", as: "source" },
            { card: "BT5-020", as: "gabumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("may decline the On Play free play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT5-092", as: "source" },
            { card: "BT5-007", as: "agumon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const agumonId = s.inst("agumon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === agumonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === agumonId)).toBe(false);
  });

  it("keeps the cost reducer under the printed Main activation timing", async () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(onPlay).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Agumon", "Gabumon"], match: "nameExact" }],
            },
            count: 1,
          },
        },
      ],
    });
    expect(main).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostModifier",
          costType: "digivolve",
          amount: 1,
          restriction: "suspendThisTamer",
          duration: "forTheTurn",
          into: {
            nameOrTrait: [{ tokens: ["Garurumon", "Omnimon", "Greymon"], match: "name" }],
            excludeNameOrTrait: [
              { tokens: ["DoruGreymon"], match: "nameExact" },
              { tokens: ["BurningGreymon"], match: "nameExact" },
              { tokens: ["DexDoruGreymon"], match: "nameExact" },
            ],
          },
        },
      ],
    });
  });

  it("suspends to reduce a qualifying Greymon digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-092", as: "nokia" },
            { card: "BT5-007", as: "base" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    const [effect] = activatableEffects(s, "nokia");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("nokia").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("nokia").isSuspended && s.perm("base").topCard.cardId === "BT1-015");

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce an unrelated digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-092", as: "nokia" },
            { card: "BT5-063", as: "base" },
          ],
          hand: [{ card: "BT5-067", as: "infermon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const [effect] = activatableEffects(s, "nokia");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("nokia").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT5-067");
    expect(s.state.memory).toBe(1);
    expect(s.perm("nokia").isSuspended).toBe(false);
  });

  it("cannot pay the reduction when Nokia is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-092", as: "nokia", suspended: true },
            { card: "BT5-007", as: "base" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    const [effect] = activatableEffects(s, "nokia");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("nokia").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-015");
    expect(s.state.memory).toBe(0);
    expect(s.perm("nokia").isSuspended).toBe(true);
  });

  it("rejects an explicitly excluded DoruGreymon destination", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-092", as: "nokia" },
            { card: "BT10-062", under: ["BT5-063"], as: "base" },
          ],
          hand: [{ card: "BT13-072", as: "doruGreymon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [effect] = activatableEffects(s, "nokia");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("nokia").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("doruGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-072");
    expect(s.state.memory).toBe(0);
    expect(s.perm("nokia").isSuspended).toBe(false);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT5-092", as: "securityTamer", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityTamer").instanceId;

    const resolution = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    await settle();
    expect(s.decisions).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    await resolution;

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});
