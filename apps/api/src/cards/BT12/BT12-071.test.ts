import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-071.js";

describe("BT12-071 AncientWisemon", () => {
  it("reveals 3 on an opponent attack, plays a black cost-6 card, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-066", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("plays a black level-4 Hybrid from hand on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-071", as: "ancient" }], hand: [{ card: "BT12-066", as: "hybrid" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066")).toBe(true);
  });

  it("can play a qualifying black Tamer from the reveal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-094", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-094"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-094")).toBe(true);
  });

  it("resolves the opponent-attack reveal at most once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-071", as: "ancient" }],
          deck: ["BT12-066", "BT1-009", "BT1-010", "BT12-066", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT12-066").length === 1);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT12-066")).toHaveLength(1);
  });
});
