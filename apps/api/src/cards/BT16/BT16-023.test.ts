import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-023.js";
import "../index.js";

describe("BT16-023", () => {
  it("unsuspends your Digimon and bottoms an opposing level 4 or lower Digimon", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Unsuspend",
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("at exactly 3 security, unsuspends an ally and bottoms an opposing level 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-023", as: "source" },
            { card: "BT16-018", as: "ally", suspended: true },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: "BT16-018", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => !s.perm("ally").isSuspended && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT16-018");
  });
});
