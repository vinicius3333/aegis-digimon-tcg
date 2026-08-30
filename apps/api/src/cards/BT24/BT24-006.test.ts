import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-006.js";
import "../index.js";

describe("BT24-006 Tapmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-006")).toMatchObject({
      cardId: "BT24-006",
      nameEn: "Tapmon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Tap"],
    });
  });

  it("draws one and trashes one hand card when linked", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
    expect(inherited.actions[0].actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
    ]);
  });

  it("draws then trashes once only when this evolution stack gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT24-006"] },
            { card: "BT1-009", as: "otherHost" },
          ],
          hand: [{ card: "BT4-022", as: "startingHand" }],
          deck: [{ card: "BT4-022", as: "drawn" }, "BT4-022"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("otherHost").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
