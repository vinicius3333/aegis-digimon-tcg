import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-082.js";

describe("BT13-082 Peckmon", () => {
  it("has Blocker", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("lets the opponent trash from hand when deleted outside battle", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      condition: {
        kind: "not",
        condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
        raw: "deleted outside of a battle",
      },
    });
  });

  it("trashes an opposing hand card when deleted outside battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-082"] }] }, 1: { hand: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("does not trash from hand when the inherited host is deleted by battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-082"] }] }, 1: { hand: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT1-001");
  });
});
