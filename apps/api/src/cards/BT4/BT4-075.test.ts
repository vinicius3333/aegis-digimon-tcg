import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-075.js";

describe("BT4-075 Blastmon", () => {
  it("has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-075", as: "blast" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
  });

  it("lets the opponent redirect its attack to an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT2-083", as: "declared", suspended: true },
            { card: "BT1-009", as: "redirect" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const declaredId = s.perm("declared").permanentId;
    const redirectId = s.perm("redirect").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: declaredId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === declaredId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.decisions).toContainEqual(
      expect.objectContaining({
        seat: 1,
        req: expect.objectContaining({ kind: "selectCards" }),
      }),
    );
  });

  it("lets the defending player decline the redirect without prompting Blastmon's controller", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT2-083", as: "declared", suspended: true },
            { card: "BT1-009", as: "redirect" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const declaredId = s.perm("declared").permanentId;
    const redirectId = s.perm("redirect").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: declaredId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!;
    expect(decision.seat).toBe(1);
    expect(decision.req.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === declaredId)).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});
