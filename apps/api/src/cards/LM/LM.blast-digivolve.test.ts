import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-017.js";
import "./LM-021.js";
import "./LM-022.js";
import "./LM-023.js";
import "./LM-024.js";
import "./LM-025.js";
import "./LM-026.js";
import "./LM-043.js";
import "./LM-044.js";

const cases = [
  ["LM-017", "BT2-071"],
  ["LM-021", "BT1-026"],
  ["LM-022", "AD1-014"],
  ["LM-023", "BT1-057"],
  ["LM-024", "BT1-075"],
  ["LM-025", "BT2-056"],
  ["LM-026", "BT10-079"],
  ["LM-043", "BT10-064"],
  ["LM-044", "BT10-079"],
] as const;

describe.each(cases)("%s Blast Digivolve", (cardId, baseCard) => {
  it("is offered in a real Counter window and digivolves from hand without memory cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "card" }], battleArea: [{ card: baseCard, as: "base" }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("card").instanceId,
        permanentId: s.perm("base").permanentId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId);

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("card").instanceId)).toBe(false);
  });
});
