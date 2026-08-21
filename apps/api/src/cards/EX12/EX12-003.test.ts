import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-003 Kapurimon", () => {
  it("uses the ME Digimon that would leave and another Digimon as DNA materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const partnerId = s.perm("partner").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byRule");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-017");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-016", "EX12-003", "EX12-055"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === partnerId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not replace a leave caused by its controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("partner").permanentId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(true);
  });

  it("does not react when a non-ME Digimon would leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "host", under: ["EX12-003"] },
            { card: "BT1-009", as: "nonMe" },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("nonMe").permanentId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-016")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(true);
  });

  it("allows the controller to decline the optional DNA replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("partner").permanentId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(true);
  });

  it("pins the trigger subject as a material and keeps DNA requirements enforced", () => {
    const effect = registeredCompiledCards.get("EX12-003")!.effects[0]!;
    expect(effect.trigger).toBe("AllTurns");
    expect(effect.isInherited).toBe(true);
    expect(effect.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["ME"] }] },
    });
    expect(effect.actions[0]!.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      materials: { count: 2, includeRef: "triggerSubject" },
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["ME"] }] },
      payCost: true,
      optional: true,
    });
  });
});
