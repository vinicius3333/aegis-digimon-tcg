import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import { compiled } from "./BT15-033.js";

function attackHost(board: BoardSpec) {
  const s = setupEngine({ ...board, 1: { battleArea: [{ card: "BT15-029", as: "attacker" }] } });
  s.state.turnSeat = 1;
  return s;
}

describe("BT15-033", () => {
  it("has Barrier as its own effect and no inherited effect", () => {
    expect(registeredCompiledCards.get("BT15-033")).toBeDefined();
    expect(compiled.effects).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    ]);
  });

  it.each([
    [true, true],
    [false, false],
  ])(
    "trashes the top security card to prevent its own battle deletion when accepted (%s)",
    async (accept, survives) => {
      const s = attackHost({
        0: {
          battleArea: [{ card: "BT15-033", as: "host", suspended: true }],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
        },
      });
      await s.ready();
      const hostId = s.perm("host").permanentId;

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: hostId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
      expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept })).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());

      expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(survives);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(
        survives
          ? [s.inst("bottomSecurity").instanceId]
          : [s.inst("topSecurity").instanceId, s.inst("bottomSecurity").instanceId],
      );
    },
  );

  it("cannot prevent battle deletion with an empty security stack", async () => {
    const s = attackHost({ 0: { battleArea: [{ card: "BT15-033", as: "host", suspended: true }] } });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
  });

  it("does not give Barrier to the Digimon it digivolves into", async () => {
    const s = attackHost({
      0: {
        battleArea: [{ card: "EX5-029", as: "host", suspended: true, under: ["BT15-033"] }],
        security: [{ card: "BT1-009", as: "security" }],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.decisions).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("does not spend security or prevent deletion by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-033", as: "host" }],
        security: [{ card: "BT1-009", as: "security" }],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
  });
});
