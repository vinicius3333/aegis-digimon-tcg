import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-006.js";

describe("EX8-006", () => {
  it("inherits a once-per-turn optional attack effect that trashes a card to delete an opposing level 3 Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { levels: [3] } },
          condition: { kind: "selfHasTrait" },
          cost: { kind: "trash", target: { count: 1 } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    }));
  it("keeps the NSo gate on the live inherited effect", () => {
    const action = compiled.effects?.find((entry) => entry.isInherited)?.actions[0];
    expect(action).toMatchObject({
      condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["NSo"], match: "trait" }] } },
    });
  });

  it("trashes a card as cost and deletes an opposing level 3 Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-009", as: "cost" }],
          battleArea: [{ card: "EX8-008", as: "host", under: ["EX8-006"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
