import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-08.js";

describe("ST19-08 ShoeShoemon", () => {
  it("plays a LIBERATOR Tamer costing 4 or less from hand without cost in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 7000 }] },
        1: { security: [{ card: "ST19-08", as: "shoe" }], hand: [{ card: "ST19-14", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-14"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-14")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("matches the errata and inherited security-DP catalog text", () => {
    expect(getCardDefinition("ST19-08")).toMatchObject({
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
      effectText: expect.stringContaining("＜Overclock ([Puppet] trait)＞"),
    });
  });

  it("also accepts the LIBERATOR card from trash and rejects a play-cost overflow", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 7000 }] },
        1: {
          security: [{ card: "ST19-08", as: "shoe" }],
          trash: [
            { card: "ST19-14", as: "eligible" },
            { card: "ST19-12", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-14"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-12")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(false);
  });

  it("does not play a LIBERATOR Digi-Egg from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 7000 }] },
        1: {
          security: [{ card: "ST19-08", as: "shoe" }],
          trash: [{ card: "ST19-01", as: "egg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-01")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("egg").instanceId)).toBe(true);
  });
});
