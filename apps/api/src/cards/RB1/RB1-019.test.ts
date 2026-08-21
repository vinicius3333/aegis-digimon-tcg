import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-019 ShinMonzaemon", () => {
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
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId)).toBe(
      false,
    );
  });
});
