import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-074.js";
import "./EX2-044.js";

describe("EX2-074 Beelzemon: Blast Mode", () => {
  it("deletes every opposing Digimon tied for highest level when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-044", as: "base" }], hand: [{ card: "EX2-074", as: "evolution" }] },
        1: { battleArea: ["EX2-029", "EX2-043", "EX2-019"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX2-019"]);
  });

  it("deletes 1 opposing level 4 or lower Digimon when directly trashed from the deck", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-044", as: "miller" }],
          deck: [{ card: "EX2-074", as: "trashedBlastMode" }, "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "level4" },
            { card: "EX2-023", as: "level5" },
          ],
          security: ["BT1-002"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredTargets,
      },
    );
    const preferredTarget = s.perm("level4").topCard.instanceId;
    preferredTargets.push(preferredTarget);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("miller").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
      preferredTarget,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("EX2-023");
  });

  it("gains Security Attack +1 for each complete 10 cards in its trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-074", as: "blastMode" }],
        trash: Array.from({ length: 20 }, () => "BT1-001"),
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("blastMode"), "SecurityAttack")).toBe(2);
  });

  it("uses the ten-card floor and does not apply the bonus during the opponent's turn", async () => {
    const below = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "nine" }], trash: Array.from({ length: 9 }, () => "BT1-001") },
    });
    await below.ready();
    expect(observe(below.engine).keywordAmount(below.perm("nine"), "SecurityAttack")).toBe(0);

    const at = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "ten" }], trash: Array.from({ length: 10 }, () => "BT1-001") },
    });
    await at.ready();
    expect(observe(at.engine).keywordAmount(at.perm("ten"), "SecurityAttack")).toBe(1);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "opponentTurn" }], trash: Array.from({ length: 20 }, () => "BT1-001") },
      1: { deck: ["BT1-001"] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("opponentTurn"), "SecurityAttack")).toBe(0);
  });
});
