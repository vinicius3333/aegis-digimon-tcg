import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-057.js";
import "../index.js";

describe("BT15-057", () => {
  it("matches the catalog identity and black level-4 evolution route", () => {
    expect(getCardDefinition("BT15-057")).toMatchObject({
      nameEn: "Numemon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      types: ["Mollusk", "X Antibody"],
    });
  });

  it("grants an On Deletion effect when Numemon or X Antibody is stacked", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          effectText:
            "[On Deletion] You may play 1 Digimon card with [Numemon] in its name from your trash without paying the cost.",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Numemon"], match: "name" },
                { tokens: ["X Antibody"], match: "trait" },
              ],
            },
          },
        },
      ],
    }));
  it("plays one Numemon from trash as an inherited deletion effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    }));

  it("naturally grants and resolves the stack-gated On Deletion play after a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "base" }],
          hand: [{ card: "BT15-057", as: "numemonX" }],
          trash: [{ card: "BT2-056", as: "fromTrash" }],
        },
        1: {
          battleArea: [{ card: "BT15-053", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("numemonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-057");

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("base").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT2-056"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard!.cardId)).toContain("BT2-056");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("fromTrash").instanceId);
  });
});
