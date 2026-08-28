import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("RB1-019 ShinMonzaemon", () => {
  it("moves every level 3 to its owner's security and weakens only opposing level 4 or higher Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-019", as: "shin" },
            { card: "RB1-005", as: "ownLevel3" },
          ],
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

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shin"));

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
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("shin"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.state.players[1]!.security.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });
});
