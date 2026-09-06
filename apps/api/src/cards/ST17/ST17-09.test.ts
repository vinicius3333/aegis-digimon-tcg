import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-09 Cherubimon", () => {
  it("has Alliance, deletes an opposing level 4 Digimon, and plays a qualifying card from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-07", as: "base" }],
          hand: [{ card: "ST17-09", as: "cherubimon" }],
          trash: [
            { card: "ST17-04", as: "revived" },
            { card: "BT1-009", as: "wrongColor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(true);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("uses its printed Alliance in a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST17-09", as: "cherubimon" },
          { card: "ST1-02", as: "ally" },
        ],
      },
      1: { security: ["ST2-10", "ST2-10"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("cherubimon").permanentId, "Alliance")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cherubimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      permanentId: s.perm("cherubimon").permanentId,
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "allianceResolved")).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cherubimon").permanentId),
    ).toBe(true);
  });
});
