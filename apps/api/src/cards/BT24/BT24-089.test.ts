import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_089 } from "./BT24-089.js";
import "../index.js";

function delayEffectKey(s: ReturnType<typeof setupEngine>): string {
  const optionCard = s.perm("option").topCard;
  const source = (s.engine as unknown as { cardSourceOf(card: typeof optionCard): CardSource }).cardSourceOf(
    optionCard,
  );
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT24-089/"))!
    .effectKey;
}

describe("BT24-089 Unique Emblem: Blazing Conductor", () => {
  it("arms Delay on Owen suspension and keeps the digivolve in a separate Delay Main effect", () => {
    const yourTurn = BT24_089.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }] },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });

    const delay = BT24_089.effects?.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toBeDefined();
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      requiresDelayArmed: true,
      from: ["hand"],
      reduceCost: 3,
      optional: true,
      into: {
        or: [
          { nameOrTrait: [{ tokens: ["Reptile"], match: "trait" }] },
          {
            and: [
              { nameOrTrait: [{ tokens: ["Dragonkin"], match: "trait" }] },
              { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
            ],
          },
        ],
      },
    });
  });

  it("plays an exact Elizamon or Owen and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-008", as: "elizamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-008")).toBe(true);
  });

  it("cannot activate the conditional Delay payload before Owen suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT24-008", as: "base" },
          ],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-012", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-089"));
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delayEffectKey(s),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();

    expect(s.perm("base").topCard.cardId).toBe("BT24-008");
    expect(s.state.players[0]!.battleArea).toContain(s.perm("option"));
  });

  it("arms on exact Owen suspension and digivolves into a Reptile with cost reduced by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT24-082", as: "owen" },
            { card: "BT24-008", as: "base" },
          ],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: "BT24-012", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-089"));
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).verb.suspend([s.perm("owen").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delayEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it.each([
    ["Dragonkin without LIBERATOR", "BT24-011"],
    ["LIBERATOR without Reptile or Dragonkin", "BT23-064"],
  ])("rejects %s as the Delay evolution target (Q5680)", async (_label, evolution) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT24-082", as: "owen" },
            { card: "BT24-008", as: "base" },
          ],
          hand: [
            { card: "BT24-089", as: "option" },
            { card: evolution, as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-089"));
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.suspend([s.perm("owen").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delayEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("base").topCard.cardId).toBe("BT24-008");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-089", as: "option" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-089"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-008")).toBe(true);
  });
});
