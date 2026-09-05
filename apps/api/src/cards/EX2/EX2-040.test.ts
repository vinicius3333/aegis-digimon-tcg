import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-040.js";

describe("EX2-040 Devidramon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-040", as: "devidramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("devidramon"), "Retaliation")).toBe(true);
  });

  it("trashes the top two cards when its inherited effect is accepted on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }], deck: ["BT1-001", "BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });

  it("does not trash cards when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }], deck: ["BT1-001", "BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
