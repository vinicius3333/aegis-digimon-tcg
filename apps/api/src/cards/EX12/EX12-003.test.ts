import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
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

  it("does not prevent the leave when the ME card in hand has no DNA Digivolve requirement (Q6724)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-016", as: "notDna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leavingId = s.perm("leaving").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([leavingId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === leavingId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-016")).toBe(true);
  });

  it("does not DNA digivolve into an ME card whose only requirement is a normal digivolve cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-059", as: "noDnaRecipe" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leavingId = s.perm("leaving").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([leavingId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === leavingId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-059")).toBe(true);
  });

  it("does not prevent the leave when the other material fails the destination recipe (Q6725)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "leaving", under: ["EX12-003"] },
            { card: "EX12-012", as: "wrongPartner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leavingId = s.perm("leaving").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([leavingId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === leavingId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(true);
  });

  it("can use a different leaving ME Digimon and Kapurimon's host as the other material (Q6726)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "host", under: ["EX12-003"] },
            { card: "EX12-055", as: "leaving" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leavingId = s.perm("leaving").permanentId;
    const hostId = s.perm("host").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([leavingId], "byRule")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-017");
    expect(result?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-016", "EX12-003", "EX12-055"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === leavingId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });

  it("keeps the DNA result in play when the original ME Digimon would be returned to hand (Q6727)", async () => {
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
    s.state.turnSeat = 1;
    const leavingInstanceId = s.perm("leaving").topCard.instanceId;
    await s.ready();

    await advance(s.engine).verb.returnToHand([leavingInstanceId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-017");
    expect(result?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-016", "EX12-003", "EX12-055"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-016")).toBe(false);
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
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("partner").permanentId),
    ).toBe(true);
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

  it("does not react when an opponent's ME Digimon would leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-016", as: "host", under: ["EX12-003"] },
            { card: "EX12-055", as: "partner" },
          ],
          hand: [{ card: "EX12-017", as: "result" }],
        },
        1: { battleArea: [{ card: "EX12-055", as: "opponentMe" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponentId = s.perm("opponentMe").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([opponentId], "byRule")).toBe(1);
    await settle();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
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
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("partner").permanentId),
    ).toBe(true);
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
    expect(irNode(effect.actions[0]!).actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      materials: { count: 2, includeRef: "triggerSubject" },
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["ME"] }] },
      payCost: true,
      optional: true,
    });
  });

  it("still replaces a leave caused by the opponent's effect", async () => {
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
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-017"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-017");
    expect(result?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-016", "EX12-003", "EX12-055"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-017")).toBe(false);
  });
});
