import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-012.js";
import "../index.js";

describe("EX6-012 Biyomon", () => {
  it("has Blocker and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it("exposes Blocker while top card and inherited Jamming when stacked", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "EX6-012", as: "top" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("top"), "Blocker")).toBe(true);
    expect(observe(top.engine).hasKeyword(top.perm("top"), "Jamming")).toBe(false);

    const stacked = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-012"] }] } });
    await stacked.ready();
    expect(observe(stacked.engine).hasKeyword(stacked.perm("host"), "Blocker")).toBe(false);
    expect(observe(stacked.engine).hasKeyword(stacked.perm("host"), "Jamming")).toBe(true);
  });

  it("uses Blocker to redirect an opponent's player attack into Biyomon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-012", as: "biyomon" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const blockerId = s.perm("biyomon").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("biyomon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === blockerId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses inherited Jamming to survive a tie with an opponent's security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-012"] }] },
      1: { security: [{ card: "BT1-009", as: "securityDigimon" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("host").instanceId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
