import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("RB1-019 ShinMonzaemon", () => {
  it("moves every level 3 to its owner's security and weakens only opposing level 4 or higher Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-018", as: "base" },
            { card: "RB1-005", as: "ownLevel3" },
          ],
          hand: [{ card: "RB1-019", as: "shin" }],
        },
        1: {
          battleArea: [
            { card: "RB1-011", as: "opposingLevel3" },
            { card: "RB1-024", as: "opposingLevel5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const ownLevel3 = s.perm("ownLevel3").topCard.instanceId;
    const opposingLevel3 = s.perm("opposingLevel3").topCard.instanceId;

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length >= 1 && s.state.players[1]!.security.length >= 1);

    expect(s.state.players[0]!.security.at(0)).toMatchObject({ instanceId: ownLevel3, faceUp: false });
    expect(s.state.players[1]!.security.at(0)).toMatchObject({ instanceId: opposingLevel3, faceUp: false });
    expect(s.perm("opposingLevel5").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("opposingLevel5"), "SecurityAttack")).toBe(-1);
  });

  it("places the attacked opponent Digimon face down at security bottom after trashing Numemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-019", as: "shin", under: [{ card: "RB1-017", as: "numemon" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.state.players[1]!.security.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });
});
