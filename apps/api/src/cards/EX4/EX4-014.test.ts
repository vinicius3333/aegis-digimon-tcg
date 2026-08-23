import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-014.js";
import "../index.js";

describe("EX4-014 Gaossmon", () => {
  it("draws when either player's Blue Flare card is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare"] }] },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });
  it("returns a DigiXros-requirement Digimon when either player's Twilight card is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Twilight"] }] },
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], hasDigiXrosRequirements: true } },
        },
      ],
    });
  });

  it("draws when an opponent's Blue Flare card is played during your turn", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-010", "BT1-011"], battleArea: [{ card: "EX4-014", as: "gaossmon" }] },
        1: { battleArea: [{ card: "BT10-018", as: "blueFlare" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent("None" as never, s.perm("gaossmon"));

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("blueFlare").permanentId });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
