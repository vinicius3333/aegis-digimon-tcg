import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("optional processing across shared timing limits", () => {
  it.each([true, false])("tracks Leopardmon's shared use when its modal action is declined=%s", async (decline) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-053", as: "base" }],
          hand: [
            { card: "EX13-043", as: "leopardmon" },
            { card: "BT9-045", as: "mammal" },
            { card: "BT9-045", as: "secondMammal" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        declinePrompts: ["suspend 1 Digimon", "return 1", ...(decline ? ["play 1"] : [])],
      },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX13-043" && s.state.pendingDecision === undefined);
    const playOffers = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText?.includes("play 1"));
    await settle(() => playOffers().length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mammal").instanceId)).toBe(decline);
    // Keep another legal candidate available so absence of a second offer proves the
    // shared limit, rather than an empty-hand preflight.

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(playOffers()).toHaveLength(decline ? 2 : 1);
    assertNoLoudGap(s);
  });
});
