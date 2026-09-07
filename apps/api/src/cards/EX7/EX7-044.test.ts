import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-044.js";

describe("EX7-044", () => {
  it("reveals 4, places a Three Musketeers Option under itself, and then may delete a low-cost opposing Digimon or Tamer", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 4,
        add: [{ count: 1, to: "placeUnder", underFilter: { isSelfRef: true } }],
      },
      { kind: "Delete", target: { count: 1, filter: { playCostLte: 3 } }, condition: { kind: "ifThisEffectActed" } },
    ]));
  it("inherits Collision", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Collision",
      raw: "＜Collision＞",
    }));

  it("deletes an opposing low-cost permanent after successfully placing the revealed Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "competitor" },
            { card: "EX7-044", as: "giga" },
          ],
          deck: ["EX7-066", "BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giga"));
    expect(s.perm("giga").stack.some((card) => card.cardId === "EX7-066")).toBe(true);
    expect(s.perm("competitor").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-058")).toBe(false);
  });

  it("resolves the When Digivolving branch, deletes a low-cost Tamer, and returns misses to the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "giga" }],
          deck: ["EX7-066", "BT1-009", "BT1-010", "BT1-014", "BT1-038"],
        },
        1: { battleArea: [{ card: "EX7-065", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("giga"));
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
    await settle(
      () =>
        s.perm("giga").topCard?.cardId === "EX7-044" &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.deck.length === 4,
    );
    expect(s.perm("giga").topCard?.cardId).toBe("EX7-044");
    expect(s.perm("giga").stack.some((card) => card.cardId === "EX7-066")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-038", "BT1-009", "BT1-010", "BT1-014"]);
  });

  it("returns a reveal with no qualifying Option to the chosen deck destination", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "giga" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-045"],
        },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giga"));
    await settle(() => s.state.players[0]!.deck.length === 5);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-045",
    ]);
    expect(s.perm("giga").stack).toHaveLength(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT10-058");
  });

  it("does not activate its On Play effect from the breeding area", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "EX7-044", as: "giga" }, deck: ["EX7-066", "BT1-009", "BT1-014", "BT1-038"] },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giga"));
    await settle(() => s.state.players[0]!.deck.length === 4);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX7-066", "BT1-009", "BT1-014", "BT1-038"]);
    expect(s.perm("target").topCard?.cardId).toBe("BT10-058");
  });
});
