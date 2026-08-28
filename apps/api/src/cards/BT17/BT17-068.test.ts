import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { revealedDefinition } from "../../engine/effects/interpreter/actions/reveal.js";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT17-068.js";
import "./index.js";

const MEPHISTOMON = "BT17-068";
const GULFMON = "BT17-070"; // Gulfmon Lv6 — eligible for [On Deletion]

describe("BT17-068 Mephistomon — [On Deletion] play Gulfmon from hand", () => {
  it("keeps the Gulfmon-or-level-6-Dark-Masters alternatives distinct", () => {
    const action = compiled.effects?.[1]?.actions?.[0] as any;
    expect(action.target.filter.nameOrTrait).toEqual([{ tokens: ["Gulfmon"], match: "name" }]);
    expect(action.target.orFilters).toEqual([
      expect.objectContaining({ levels: [6], nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] }),
    ]);
  });

  it("[On Deletion] plays Gulfmon from hand to battle area when Mephistomon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const mephPermId = s.perm("meph").permanentId;
    const gulfId = s.inst("gulfmon").instanceId;
    await advance(s.engine).verb.deletePermanent([mephPermId], "byEffect");
    await settle(() => !p0?.battleArea.some((p) => p.permanentId === mephPermId), 1000);

    // Verify Mephistomon was actually deleted (not still alive).
    expect(p0?.battleArea.some((p) => p.permanentId === mephPermId)).toBe(false);

    // Wait for [On Deletion] to resolve (Gulfmon played to battle area).
    await settle(() => p0?.battleArea.some((p) => p.topCard?.cardId === GULFMON) ?? false, 400);

    // Mephistomon was deleted in battle; [On Deletion] fired and played Gulfmon.
    const gulfInBattle = p0?.battleArea.some((p) => p.topCard?.instanceId === gulfId);
    expect(gulfInBattle).toBe(true);
  });

  it("does not play Gulfmon after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: { battleArea: [{ card: "BT1-019", dp: 13000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("meph").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === MEPHISTOMON));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === GULFMON)).toBe(true);
  });

  it("places a qualifying Dark Masters-text card and gains DP after a natural inherited attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GULFMON, under: [MEPHISTOMON], as: "host" }],
          trash: [{ card: "BT15-072", as: "darkMastersText" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT15-072"));

    expect(s.perm("host").stack.some((card) => card.cardId === "BT15-072")).toBe(true);
    expect(s.perm("host").currentDP).toBe(13000);
  });

  it("keeps the revealed-from-deck level override resolved in runtime metadata", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter.js");
    const compiled = runtimeCompiledCard(MEPHISTOMON)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});

describe("BT17-068 Mephistomon — revealed level", () => {
  it("is treated as level 6 by revealed-card filters while retaining level 5", () => {
    const card = { cardId: "BT17-068", instanceId: "meph", ownerSeat: 0 } as any;
    const def = revealedDefinition({ game: { definitionOf: () => getCardDefinition("BT17-068")! } } as any, card);

    expect(def.level).toBe(6);
    expect(def.treatedAsLevels).toEqual([5, 6]);
  });

  it("gets accepted as both level 5 and level 6 by a natural deck reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "dokugumon" }],
          deck: [{ card: MEPHISTOMON, as: "meph" }, { card: "BT17-068", as: "otherMeph" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([MEPHISTOMON, MEPHISTOMON]);
  });
});
