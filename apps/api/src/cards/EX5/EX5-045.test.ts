import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-045.js";

describe("EX5-045 Chuumon", () => {
  it("reveals three and may play Sukamon from the top during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "trash",
      condition: { kind: "isOpponentsTurn" },
      add: [
        {
          count: 1,
          to: "play",
          optional: true,
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
          },
        },
      ],
    });
  });
  it("inherits free Chuumon play from trash if this was a Sukamon or Etemon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "nameExact", tokens: ["Chuumon"] }],
            },
          },
          condition: { kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] },
        },
      ],
    });
  });

  it("plays a Sukamon-name Digimon from the top three during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-045", as: "source" }],
          deck: ["BT11-040", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-040"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-040")).toBe(true);
  });

  it("does not play Sukamon from the top three during your own turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX5-045", as: "source" }], deck: ["BT11-040", "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-040")).toBe(false);
  });
});
