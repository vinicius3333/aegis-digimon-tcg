import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-12.js";

describe("ST6-12 VenomMyotismon", () => {
  it("gives up to 2 of your Digimon Retaliation through the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-11", as: "base" },
            { card: "ST6-11", as: "ally" },
          ],
          hand: [
            { card: "ST6-12", as: "evolving" },
            { card: "ST6-12", as: "allyEvolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ally").permanentId,
        instanceId: s.inst("allyEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").topCard.instanceId === s.inst("allyEvolution").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
  });

  it("deletes the larger opposing attacker after a granted Retaliation Digimon loses battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-11", as: "base" },
            { card: "ST6-02", as: "retaliation", suspended: true },
          ],
          hand: [{ card: "ST6-12", as: "evolving" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { battleArea: [{ card: "ST6-09", as: "attacker" }], deck: ["ST6-01"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("retaliation"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("retaliation"), "Retaliation")).toBe(true);
    const attacker = s.perm("attacker");
    const recipient = s.perm("retaliation");
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("retaliation").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === recipient.topCard.instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attacker.topCard.instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST6-09")).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
  });

  it("expires the granted Retaliation after the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-11", as: "base" },
            { card: "ST6-02", as: "ally" },
          ],
          hand: [{ card: "ST6-12", as: "evolving" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { deck: ["ST6-01"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(false);
  });
});
