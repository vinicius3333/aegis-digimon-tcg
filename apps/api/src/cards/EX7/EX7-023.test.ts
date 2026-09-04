import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-023.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-023 Hexeblaumon", () => {
  it("has Security Attack +1 and Ice Clad and trashes four evolution cards on digivolving", () => {
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(expect.arrayContaining(["SecurityAttack", "IceClad"]));
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 4,
      scope: "acrossDigimon",
      fromTop: false,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "Return",
      condition: { kind: "opponentHasNone" },
    });
  });
  it("suspends opposing Digimon with no more evolution cards than this Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      duration: "permanent",
      target: { count: "all", filter: { digivolutionCardsCompareToSource: "lte" } },
    }));

  it("trashes four opposing evolution cards then returns a Tamer when no stacks remain", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex" }] },
      1: {
        battleArea: [{ card: "BT1-009", under: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"] }, { card: "EX7-065" }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hex"));
    await settle(
      () =>
        s.state.players[1]!.battleArea[0]!.stack.length === 0 &&
        s.state.players[1]!.deck.some((card) => card.cardId === "EX7-065"),
    );
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("EX7-065");
  });

  it("prevents only opposing Digimon with no more evolution cards than its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex", under: ["EX7-018"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT1-010", as: "high", under: ["EX7-018", "EX7-020"] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("low"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("high"), "suspend")).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("low").permanentId]);
    expect(s.perm("low").isSuspended).toBe(false);
  });
});
