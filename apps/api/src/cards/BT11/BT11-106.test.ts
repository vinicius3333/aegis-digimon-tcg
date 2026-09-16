import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT11-106.js";

describe("A3 BT11-106 — granted '[On Deletion] Gain 3 memory.'", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-106")).toMatchObject({
      cardId: "BT11-106",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      {
        trigger: "Main",
        actions: [{ kind: "GrantAuraToOpponents" }, { kind: "Restrict", restriction: "cantBeBlocked" }],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd", revealCount: 3 }] },
    ]);
  });

  it("also makes the chosen Digimon unable to be blocked", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-056", as: "recipient" }], hand: [{ card: "BT11-106", as: "option" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("recipient"), "cantBeBlocked"));
    expect(observe(s.engine).isRestricted(s.perm("recipient"), "cantBeBlocked")).toBe(true);
  });

  it("POSITIVE: deleting the granted OWN Digimon gains 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-056", dp: 1000, as: "recipient" }],
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const option = s.inst("option");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(
      () =>
        !p0.hand.some((c) => c.instanceId === option.instanceId) &&
        engine.continuous.listCustomEffectGrants().length > 0,
      3000,
    );

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId && g.token === "[On Deletion] Gain 3 memory.",
      ),
    ).toBe(true);

    s.state.memory = 5;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p0.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(8);
  });

  it("NEGATIVE: a same-name Digimon that never received the grant costs nothing on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-056", dp: 1000, as: "recipient" },
            { card: "BT11-041", dp: 7000, as: "bystander" },
          ],
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p0.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(s.state.memory).toBe(5);
  });
});
