import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-009.js";
import "../BT6/BT6-082.js";

describe("BT13-009 Huckmon", () => {
  it("keeps the BaoHuckmon destination exact while Sistermon remains a name family", () => {
    const subTrigger = compiled.effects[0]?.actions[0];
    expect(subTrigger?.kind).toBe("SubTrigger");
    if (subTrigger?.kind !== "SubTrigger") throw new Error("Expected SubTrigger action");
    const digivolve = subTrigger.actions?.[0];
    expect(digivolve?.kind).toBe("Digivolve");
    if (digivolve?.kind !== "Digivolve") throw new Error("Expected Digivolve action");
    const sourceReference = subTrigger.sourceFilter?.nameOrTrait?.[0];
    const destinationReference = digivolve.into?.nameOrTrait?.[0];
    if (sourceReference === undefined || destinationReference === undefined) {
      throw new Error("Expected Sistermon and BaoHuckmon name references");
    }

    expect(sourceReference).toEqual({ tokens: ["Sistermon"], match: "name" });
    expect(destinationReference).toEqual({ tokens: ["BaoHuckmon"], match: "nameExact" });
    expect(matchNameOrTrait({ nameEn: "Sistermon Ciel" }, sourceReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "BaoHuckmon" }, destinationReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "BaoHuckmon: Werewolf Mode" }, destinationReference)).toBe(false);
  });

  it("may digivolve into BaoHuckmon from hand for free when its controller plays a Sistermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-009", as: "huckmon" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-013", as: "bao" },
          ],
          deck: ["BT1-010", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("huckmon").topCard.cardId === "BT13-013");

    expect(s.state.memory).toBe(7);
    expect(s.perm("huckmon").stack.some((card) => card.cardId === "BT13-009")).toBe(true);
  });

  it("may decline the free BaoHuckmon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-009", as: "huckmon" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-013", as: "bao" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.perm("huckmon").topCard.cardId).toBe("BT13-009");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-013")).toBe(true);
  });

  it("gains memory once per own turn from allied Sistermon plays and resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: [{ card: "BT13-009", as: "source" }] }],
        hand: [
          { card: "BT6-082", as: "first" },
          { card: "BT6-082", as: "second" },
          { card: "BT6-082", as: "third" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
      1: { hand: ["BT1-010"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();

    const sourceId = s.inst("source").instanceId;
    s.state.turnSeat = 0;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();
    expect(s.state.memory).toBe(5);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trigger for a Digimon without Sistermon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-009"] }],
        hand: [{ card: "BT1-012", as: "biyomon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(7);
  });
});
