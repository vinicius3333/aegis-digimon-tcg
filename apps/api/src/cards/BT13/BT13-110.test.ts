import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT13-110.js";

function activatableEffects(s: ReturnType<typeof setupEngine>, instanceId: string) {
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
  return JSON.parse(
    s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === instanceId)?.activatableEffectsJson ?? "[]",
  ) as Array<{ instanceId: string; effectKey: string }>;
}

describe("BT13-110 Royal Knights of the Purge", () => {
  it("has complete compiled coverage and registers a live Option", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const s = setupEngine({ 0: { hand: [{ card: "BT13-110", as: "option" }] } });
    await s.ready();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-110")).toBe(true);
  });

  it("draws, may place a Digimon from hand under a breeding-area King Drasil, then places itself", () => {
    const actions =
      compiled.effects?.find((entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "Draw")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(actions[1]).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand"],
      optional: true,
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ match: "name", tokens: ["King Drasil_7D6"] }],
      },
    });
    expect(actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });

  it("has a Delay branch that plays one Royal Knight from breeding digivolution cards with Rush", () => {
    const delay = compiled.effects?.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
    );
    expect(delay).toBeDefined();
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
      suppressOnPlayEffects: true,
      requiresDelayArmed: true,
      bindResultAs: "playedDigimon",
      target: {
        filter: {
          controller: "mine",
          hostFilter: { zone: "breeding" },
          nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }],
        },
        count: 1,
      },
    });
    expect(delay?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      target: { filter: { boundRef: "playedDigimon" } },
    });
  });

  it("draws, places any Digimon under a breeding King Drasil, and enters the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          hand: [
            { card: "BT13-110", as: "option" },
            { card: "BT1-045", as: "material" },
          ],
          deck: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("drasil").stack.some((card) => card.cardId === "BT1-045") &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-110"),
    );

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045")).toBe(false);
    expect(s.perm("drasil").stack.some((card) => card.cardId === "BT1-045")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-110")).toBe(true);
  });

  it("may decline placing a Digimon under King Drasil while still placing itself", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          hand: [
            { card: "BT13-110", as: "option" },
            { card: "BT1-045", as: "material" },
          ],
          deck: [],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-110"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045")).toBe(true);
    expect(s.perm("drasil").stack.some((card) => card.cardId === "BT1-045")).toBe(false);
  });

  it("uses Delay to play a Royal Knight from breeding materials without its On Play effect and grants Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-110", as: "option" }],
          breeding: { card: "BT13-007", as: "drasil", under: ["BT13-040"] },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.perm("option").topCard!.instanceId;
    const entry = activatableEffects(s, optionId).find((effect) => effect.instanceId === optionId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: entry!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-040"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-110")).toBe(true);
    expect(s.perm("drasil").stack.some((card) => card.cardId === "BT13-040")).toBe(false);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT13-040");
    expect(played).toBeDefined();
    expect(observe(s.engine).hasKeyword(played!.permanentId, "Rush")).toBe(true);
  });

  it("places itself in the battle area when revealed from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT13-110", as: "option", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-110")).toBe(true);
  });
});
