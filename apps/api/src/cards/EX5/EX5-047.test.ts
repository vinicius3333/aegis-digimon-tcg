import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-047.js";

describe("EX5-047 Leomon", () => {
  it("may digivolve into a Leomon from hand for one less when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      target: { filter: { isSelfRef: true }, isSelf: true },
      from: ["hand"],
      reduceCost: 1,
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] },
    });
  });
  it("inherits De-Digivolve 1 to one opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("digivolves into a Leomon-name card from hand through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-047", as: "attacker" }], hand: [{ card: "EX5-049", as: "leomon" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX5-049");
    expect(s.perm("attacker").topCard.cardId).toBe("EX5-049");
  });

  it("keeps the attacker unchanged when no Leomon-name card is available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX5-047", as: "attacker" }] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").stack).toHaveLength(0);
  });
});
