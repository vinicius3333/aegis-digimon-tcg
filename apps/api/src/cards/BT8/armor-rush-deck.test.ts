import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-012.js";
import "./BT8-038.js";
import "../BT9/BT9-044.js";
import "../index.js"; // the full catalog is registered in a real match

describe("BT8/BT9 Armor Rush interactions", () => {
  it("keeps Flamedramon's attacking DP bonus after Armor Purge promotes its base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-012", as: "armor", under: ["BT1-009"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 12_000, suspended: true }] },
    }, { autoSelectCards: true });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("armor").permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-012"));

    expect(s.perm("armor").topCard.cardId).toBe("BT1-009");
    expect(s.perm("armor").currentDP).toBe(s.perm("armor").baseDP + 3_000);
  });

  it("keeps Magnamon's trash-scaled DP bonus after Armor Purge promotes its base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "base" }],
        hand: [{ card: "BT8-038", as: "magnamon" }],
        trash: ["BT8-012", "BT8-023"],
      },
    }, { autoSelectCards: true });
    const basePrintedDp = s.perm("base").baseDP;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("magnamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11_000);
    await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect");

    expect(s.perm("base").topCard.cardId).toBe("BT1-027");
    expect(s.perm("base").currentDP).toBe(basePrintedDp + 4_000);
  });

  it("chains Magnamon X prevention into Magnamon's Armor Purge", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-044", as: "stack", under: ["BT1-027", "BT8-038"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const permanentId = s.perm("stack").permanentId;

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    expect(s.perm("stack").topCard.cardId).toBe("BT8-038");
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT9-044")).toBe(true);

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    expect(s.perm("stack").permanentId).toBe(permanentId);
    expect(s.perm("stack").topCard.cardId).toBe("BT1-027");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-038")).toBe(true);
  });

  it("redirects without blocking, places Magnamon X in security, then Armor Purges on the same permanent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-044", as: "armor", under: ["BT8-021", "BT8-038"] }],
        security: ["BT1-001"],
      },
      // A plain attacker: BT4-114 AncientGarurumon unsuspends itself with its own
      // [When Attacking] clause, which would mask the post-attack suspension asserted below.
      1: { battleArea: [{ card: "BT1-024", as: "attacker", dp: 13_000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const permanentId = s.perm("armor").permanentId;
    const magnamonXId = s.perm("armor").topCard!.instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.perm("attacker").isSuspended &&
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === magnamonXId),
      5000,
    );

    expect(s.events.some(({ kind }) => kind === "blocked")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(magnamonXId);
    expect(s.perm("armor").permanentId).toBe(permanentId);
    expect(s.perm("armor").topCard.cardId).toBe("BT8-038");
    expect(s.perm("armor").isSuspended).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(true);

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");

    expect(s.perm("armor").permanentId).toBe(permanentId);
    expect(s.perm("armor").topCard.cardId).toBe("BT8-021");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT8-038")).toBe(true);
  });
});
