import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-080.js";
import "./index.js";

describe("BT22-080 Eater (Human Form)", () => {
  it("uses compiled IR exclusively for all three printed effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "WhenDigivolving",
      "OnSecurityCheck",
      "YourTurn",
    ]);
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] } },
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              source: "digivolutionCards",
              hostFilter: { isSelfRef: true },
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnSecurityCheck",
      turnCondition: "yourTurn",
      condition: { kind: "triggerAttackerIsSelf" },
    });
  });

  it("moves Species Form from its evolved stack to the bottom of Mother Eater", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother" },
          battleArea: [{ card: "BT22-079", as: "species" }],
          hand: [{ card: "BT22-080", as: "human" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("species").permanentId,
        instanceId: s.inst("human").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "BT22-079") === true);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT22-007");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-079"]);
    expect(s.perm("species").topCard?.cardId).toBe("BT22-080");
    expect(s.perm("species").stack).toHaveLength(0);
  });

  it("plays a CS Tamer free when this Digimon checks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-080", as: "human" }],
          hand: [
            { card: "BT22-089", as: "cs-tamer" },
            { card: "BT1-001", as: "near-match" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: { attackerPermanentId: string }): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnSecurityCheck, { attackerPermanentId: s.perm("human").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-089"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("lets one inherited copy in breeding optionally reduce an Eater play by 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: ["BT22-080"] },
          hand: [{ card: "BT22-079", as: "played" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT22-079"));

    // BT22-079 costs 3; the inherited reduction leaves 1 memory after paying it.
    expect(s.decisions).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a non-Eater Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: ["BT22-080"] },
          hand: [{ card: "BT1-009", as: "played" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    expect(s.state.memory).toBe(1);
  });
});
