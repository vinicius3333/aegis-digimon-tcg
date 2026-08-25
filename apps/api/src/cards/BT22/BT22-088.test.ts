import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-088.js";

describe("BT22-088 Arisa Kinosaki", () => {
  it("requires returning this Tamer before resolving the then clause", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions).toHaveLength(1);
    expect(effect?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "return",
        to: "deckBottom",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          optional: true,
          condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("watches both friendly Tokens and Puppet Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        or: [{ isToken: true }, { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] }],
      },
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "suspend" },
        },
      ],
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("plays the physical Tamer through a public play intent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-088", as: "arisa" }] } });
    const arisaId = s.inst("arisa").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: arisaId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === arisaId), 300);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === arisaId)).toBe(true);
  });

  it("returns itself before playing Shoemon even without another Arisa in hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-088", as: "arisa" }], trash: [{ card: "BT22-020", as: "shoemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (
      s.engine as unknown as { fireTiming(timing: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-020"));

    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT22-088")).toBe(true);
  });
});
