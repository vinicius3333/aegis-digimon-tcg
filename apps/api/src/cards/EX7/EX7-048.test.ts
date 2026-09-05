import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-048.js";
import "../index.js";

describe("EX7-048", () => {
  it("reveals 6 and may use a Three Musketeers Option without paying its cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 6,
        add: [{ count: 1, to: "useOption", payCost: false, optional: true }],
        rest: "deckTopOrBottom",
      });
  });
  it("prevents a Three Musketeers Digimon from leaving play by trashing an Option in its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      mode: "prevent",
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: {
            zone: "digivolutionCards",
            kind: ["Option"],
            hostFilter: { isSelfRef: true },
          },
        },
      },
    }));

  it("publicly pays the replacement with its under-stack Option and stays in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-048", as: "gundra", under: ["EX7-066"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gundra"), "Blocker")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("gundra").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("gundra"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-066")).toBe(true);
  });

  it("reveals and uses a Three Musketeers Option on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-048", as: "gundra" }],
          deck: ["EX7-066", "BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gundra"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("gundra").stack.some((card) => card.cardId === "EX7-066")).toBe(true);
  });

  it("reveals and uses a Three Musketeers Option when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-048", as: "gundra" }],
          deck: ["EX7-066", "BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040", "BT1-045"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gundra"));
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const destination = s.state.pendingDecision!;
    expect(destination.kind).toBe("chooseOption");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: destination.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.deck.length === 6);
    expect(s.perm("gundra").stack.some((card) => card.cardId === "EX7-066")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-045",
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-040",
    ]);
  });

  it("does not use an Option or delete when the reveal has no Three Musketeers Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-048", as: "gundra" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040", "BT1-045", "BT1-046"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gundra"));
    await settle(() => s.state.players[0]!.deck.length === 7);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-040",
      "BT1-045",
      "BT1-046",
    ]);
    expect(s.perm("gundra").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
