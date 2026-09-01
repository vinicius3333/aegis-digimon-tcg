import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-003.js";
import "../index.js";

describe("BT26-003 Kyaromon", () => {
  it("compiles the inherited once-per-turn opponent attack redirect with the printed cost", () => {
    const effect = compiled.effects[0]!;
    expect(effect).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks" });
    expect(irNode(effect.actions[0]!).actions[0]).toMatchObject({
      kind: "RedirectAttack",
      optional: true,
      abortOnDecline: true,
      allowCostWithoutTarget: true,
    });
  });

  it("reaches the inherited source through the legal black Glowing Dawn evolution route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT26-003", as: "egg" },
        hand: [{ card: "BT26-052", as: "pristimon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("pristimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT26-052");
    expect(s.perm("egg").stack.map(({ cardId }) => cardId)).toEqual(["BT26-003"]);
    expect(s.state.memory).toBe(0);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-052"));
    expect(s.perm("egg").stack.map(({ cardId }) => cardId)).toEqual(["BT26-003"]);
  });

  it("trashes the bottom face-down Tamer card and redirects to Glowing Dawn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003", as: "egg" }] },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "bottom", faceUp: false },
                { card: "BT1-010", as: "upper", faceUp: false },
              ],
            },
            { card: "BT26-075", as: "redirect", dp: 12000 },
          ],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const redirectId = s.perm("redirect").permanentId;
    const attackerId = s.perm("attacker").topCard.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === attackerId));
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(true);
  });

  it("Q6953 pays the face-down Tamer-stack cost even with no Glowing Dawn redirect target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003" }] },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId));

    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("may decline the optional processing condition without trashing the Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003" }] },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
            { card: "BT26-075", as: "redirect", dp: 12000 },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
  });

  it("Q6952 redirects a Progress attacker even while it is unaffected by opposing effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003" }] },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
            { card: "BT26-075", as: "redirect", dp: 8000 },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT21-025", as: "progressAttacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("progressAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT21-025"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-075")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("uses the inherited redirect only once per turn across two opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003" }] },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "firstCost", faceUp: false },
                { card: "BT1-010", as: "secondCost", faceUp: false },
              ],
            },
            { card: "BT26-075", as: "redirect", dp: 8000 },
          ],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT26-014", as: "firstAttacker", dp: 7000 },
            { card: "BT26-014", as: "secondAttacker", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId),
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("secondCost").instanceId]);
  });

  it("does not pay the cost from a face-up bottom card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-052", as: "host", under: [{ card: "BT26-003" }] },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "faceUp", faceUp: true }] },
            { card: "BT26-075", as: "redirect", dp: 8000 },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("faceUp").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("faceUp").instanceId);
  });
});
