import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-019.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX9-019", () => {
  it("uses the exact WereGarurumon alternate route at cost 1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: "EX9-019", as: "evo" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
  });
  it("rejects Sagittarius Mode as a near-name card for the exact WereGarurumon route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-019", as: "base" }], hand: [{ card: "EX9-019", as: "evo" }] },
    });
    s.state.memory = 2;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evo").instanceId,
      alternateRequirementIndex: 0,
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("EX9-019");
  });
  it("prevents an opposing Digimon or Tamer from suspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
    });
  });
  it("during your turn digivolves into Garurumon after Greymon/Matt or another Greymon digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] },
      { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] },
    ]));

  it("records the opponent's suspend restriction on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-019", as: "source" }], deck: Array(8).fill("BT1-001") },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: Array(8).fill("BT1-001") },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(observe(s.engine).hasRestriction(s.perm("target"), "beSuspended")).toBe(true);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "beSuspended")).toBe(false);
  });

  it("free-digivolves into Garurumon after a real Greymon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-019", as: "source" }],
          hand: [
            { card: "BT1-015", as: "greymon" },
            { card: "ST2-11", as: "garurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("ST2-11");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("free-digivolves into Garurumon after a real Matt Ishida play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-019", as: "source" }],
          hand: [
            { card: "ST6-14", as: "matt" },
            { card: "ST2-11", as: "garurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matt").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("ST2-11");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it.each([true, false])("reacts to another Digimon evolving into Greymon (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-019", as: "source" },
            { card: "EX9-008", as: "base" },
          ],
          hand: [
            { card: "BT1-015", as: "greymon" },
            { card: "ST2-11", as: "garurumon" },
          ],
          deck: ["BT1-048", "BT1-046"],
        },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT1-015");
    expect(s.perm("source").topCard.cardId).toBe(accept ? "ST2-11" : "EX9-019");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      accept ? ["BT1-048", "BT1-046"] : ["ST2-11", "BT1-048"],
    );
  });

  it("resolves inherited De-Digivolve 1 against one opposing stack on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST2-11", as: "host", under: ["EX9-019"] }] },
        1: {
          battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009"], dp: 20000, suspended: true }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-015"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
