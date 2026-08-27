import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-051.js";

describe("BT14-051", () =>
  it("once per turn at the end of the opponent's turn reveals five and adds two green Digimon by suspending an own Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          cost: { kind: "suspend" },
          add: [{ count: 2, to: "hand", filter: { colors: ["Green"] } }],
        },
      ],
    })));

describe("BT14-051 runtime suspend cost", () => {
  it("asks before suspending at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-051", as: "okuwamon" }],
          deck: ["BT14-044", "BT14-044", "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("okuwamon"));
    await settle(() => s.perm("okuwamon").isSuspended);
    expect(s.perm("okuwamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 2);
  });

  it("stays unsuspended and adds nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-051", as: "okuwamon" }],
          deck: ["BT14-044", "BT14-044", "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("okuwamon"));
    await settle(() => false, 60);
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("okuwamon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
  });
});
