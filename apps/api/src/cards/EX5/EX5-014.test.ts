import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-014.js";
import "../index.js";

describe("EX5-014 Apollomon", () => {
  it("has Blitz and gains Security Attack plus one per three digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.keywords).toMatchObject([
      { keyword: "Blitz" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      target: { filter: { isSelfRef: true } },
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "permanent",
      scaling: { per: 3, unit: "digivolutionCards" },
    });
  });
  it("deletes an opposing Digimon at or below the source's DP when security is removed", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "YourTurn")[1]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } },
            },
          ],
        },
      ],
    });
  });

  it("gains inherited Security Attack plus one for every three digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-014", as: "six", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
          { card: "EX5-014", as: "three", under: ["BT1-009", "BT1-010", "BT1-011"] },
          { card: "EX5-014", as: "two", under: ["BT1-009", "BT1-010"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("six"), "SecurityAttack")).toBe(2);
    expect(observe(s.engine).keywordAmount(s.perm("three"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(0);
  });

  it("deletes one opposing Digimon at the DP boundary only once per turn after security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-014", as: "apollo", under: ["BT1-009", "BT1-010", "BT1-011"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 12_000, as: "boundary" },
            { card: "BT1-010", dp: 12_001, as: "tooLarge" },
            { card: "BT1-011", dp: 8_000, as: "secondEligible" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("tooLarge")).toBeDefined();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => false, 50);
    expect(s.perm("secondEligible")).toBeDefined();
  });
});
