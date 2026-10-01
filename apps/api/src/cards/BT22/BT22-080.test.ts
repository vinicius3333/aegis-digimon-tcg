import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-080.js";
import { playEaterWithBreedingReductions } from "./eaterBreeding.testSupport.js";
import "../index.js";
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

  it("plays a CS Tamer through a public attack that checks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-080", as: "human" }],
          hand: [{ card: "BT22-089", as: "cs-tamer" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const humanId = s.perm("human").permanentId;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: humanId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-089"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-089")).toBe(true);
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

describe("BT22-080 Eater (Human Form) — KB Q&A rulings", () => {
  it("lets you use just 1 of 2 copies in the breeding area to reduce an [Eater] play by 1 (Q4945)", async () => {
    expect(await playEaterWithBreedingReductions("BT22-080", "breeding", [true, false])).toEqual({
      memory: 3 - 2,
      reductionPrompts: 2,
    });
    expect(await playEaterWithBreedingReductions("BT22-080", "breeding", [true, true])).toEqual({
      memory: 3 - 1,
      reductionPrompts: 2,
    });
  });

  it("resolves the checked [Security] effect first, then the turn player's check trigger, then the opponent's removal trigger (Q4946)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-080", as: "eater" }],
          hand: [{ card: "BT22-101", as: "csTamer" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT4-097", as: "kari" }],
          security: [{ card: "BT22-083", as: "securityYuuko" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("eater").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kari").isSuspended);
    await advance(s.engine).finishAttack();

    const played = (cardId: string) =>
      s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === cardId);
    const kariTriggered = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT4-097",
    );
    expect(played("BT22-083")).toBeGreaterThan(-1);
    expect(played("BT22-083")).toBeLessThan(played("BT22-101"));
    expect(played("BT22-101")).toBeLessThan(kariTriggered);
  });

  it("uses its {Breeding} effect only from the breeding area (Q4947)", async () => {
    expect(await playEaterWithBreedingReductions("BT22-080", "battleArea", [true, true])).toEqual({
      memory: 0,
      reductionPrompts: 0,
    });
  });
});
