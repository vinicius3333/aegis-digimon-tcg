import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-031.js";
import "./BT26-031.js";

describe("BT26-031 compiled fidelity", () => {
  it("encodes recovery, suspension restriction, and the attacking recovery window", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "RecoverByTrashingMostSecurity", recover: false },
      { kind: "SelectBind", condition: { kind: "ifThisEffectActed" } },
      { kind: "Restrict", restriction: "beSuspended", condition: { kind: "ifThisEffectActed" } },
      { kind: "TrashDigivolution", fromTop: false },
      { kind: "Recover", amount: 1, condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      { kind: "TrashDigivolution", fromTop: false },
      { kind: "Recover", amount: 1 },
    ]);
  });

  it("publicly trashes the leading security stack, locks an opponent target, and recovers", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT1-001", as: "oldest" },
            { card: "BT1-002", as: "remaining" },
          ],
          deck: [{ card: "BT1-003", as: "recovery" }],
          battleArea: [
            { card: "BT26-031", as: "murasamemon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-004", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: [{ card: "BT1-010" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("murasamemon"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-004");
    expect(
      (
        s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
      ).continuous.hasRestriction(s.perm("target").permanentId, "beSuspended"),
    ).toBe(true);
  });
});
