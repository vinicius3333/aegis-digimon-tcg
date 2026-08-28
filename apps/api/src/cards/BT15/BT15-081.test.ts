import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-081.js";

describe("BT15-081", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-081")).toMatchObject({
      nameEn: "Leviamon (X Antibody)",
      colors: ["Purple"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 6 }],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Security Attack +2 and may digivolve into itself from trash when an opponent plays by effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 2 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { byEffect: true },
          actions: [{ kind: "Digivolve", into: { isSelfRef: true }, payCost: false, optional: true }],
        },
      ],
    });
  });
  it("deletes opposing Tamer and level 3/5/7 Digimon when the board-count condition is met", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", condition: { kind: "boardCountCompare" } },
        { kind: "Delete", target: { filter: { levels: [3] } } },
        { kind: "Delete", target: { filter: { levels: [5] } } },
        { kind: "Delete", target: { filter: { levels: [7] } } },
      ],
    }));

  it("naturally reacts to an opponent's effect-played Digimon and evolves Leviamon from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          security: [{ card: "BT15-088", as: "wings" }, "BT1-001"],
          trash: [{ card: "BT15-007", as: "playedByEffect" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leviamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("leviamon").topCard.cardId === "BT15-081");

    expect(s.perm("leviamon").topCard.cardId).toBe("BT15-081");
    expect(s.perm("leviamon").stack.map((card) => card.cardId)).toContain("EX5-063");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-007")).toBe(false);
  });
});
