import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-07 Rapidmon", () => {
  it("de-digivolves one opposing Digimon and protects itself from opponent deletion and return effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-07", as: "rapidmon" },
            { card: "ST17-10", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const stackBefore = s.perm("opponent").stack.length;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rapidmon"));
    expect(s.perm("opponent").stack.length).toBe(stackBefore - 1);

    s.state.turnSeat = 1;
    const rapidmonCard = s.perm("rapidmon").topCard.instanceId;
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("rapidmon").permanentId)).toBe(
      true,
    );
  });

  it("trashes the opponent's top security card once per turn when its host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-08", as: "host", under: ["ST17-07"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
