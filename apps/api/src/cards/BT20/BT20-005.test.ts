import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-005.js";

describe("BT20-005 Kapurimon", () => {
  it("grants Jamming only when this Digimon checks face-up security", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect?.trigger).toBe("YourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenCheckedFaceUpSecurity",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "GainKeyword", duration: "forTheTurn", target: { isSelf: true } }],
    });
  });

  it("observably grants Jamming for a pre-existing face-up check but not a normal reveal", async () => {
    const faceUp = setupEngine({
      0: { battleArea: [{ card: "BT20-011", dp: 5000, as: "attacker", under: ["BT20-005"] }] },
      1: { security: [{ card: "BT1-107", faceUp: true }] },
    });
    expect(
      faceUp.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: faceUp.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(faceUp.engine).hasKeyword(faceUp.perm("attacker"), "Jamming"));
    expect(observe(faceUp.engine).hasKeyword(faceUp.perm("attacker"), "Jamming")).toBe(true);

    const faceDown = setupEngine({
      0: { battleArea: [{ card: "BT20-011", dp: 5000, as: "attacker", under: ["BT20-005"] }] },
      1: { security: ["BT1-107"] },
    });
    expect(
      faceDown.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: faceDown.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => faceDown.state.players[1]!.security.length === 0);
    expect(observe(faceDown.engine).hasKeyword(faceDown.perm("attacker"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming when another allied Digimon checks face-up security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-011", dp: 5000, as: "host", under: ["BT20-005"] },
          { card: "BT20-011", dp: 5000, as: "otherAttacker" },
        ],
      },
      1: { security: [{ card: "BT1-107", faceUp: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });
});
