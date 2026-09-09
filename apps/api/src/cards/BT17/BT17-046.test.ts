import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-046.js";
import "./index.js";

describe("BT17-046 Gargomon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-046")).toMatchObject({
      cardId: "BT17-046",
      nameEn: "Gargomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      effectText: "[On Deletion] You may play 1 [Terriermon] from your trash without paying the cost.",
      inheritedEffectText: "[All Turns] While this Digimon is suspended, it gets +1000 DP.",
    });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("may play one Terriermon from trash on deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Terriermon"], match: "nameExact" }] },
        count: 1,
      },
    });
  });

  it("gains 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("naturally plays a Terriermon from trash when deletion removes Gargomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-046", dp: 6000, suspended: true, as: "gargomon" }],
          trash: [{ card: "BT17-043", as: "terriermon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const terriermonId = s.inst("terriermon").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("gargomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === terriermonId),
    );

    // Played without paying: memory is untouched by the free play.
    expect(s.state.memory).toBe(memoryBefore);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === terriermonId)!;
    expect(played.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT17-046"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("leaves the Terriermon in trash when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-046", dp: 6000, as: "gargomon" }],
          trash: [{ card: "BT17-043", as: "terriermon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const terriermonId = s.inst("terriermon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("gargomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT17-046"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === terriermonId)).toBe(true);
  });

  it("finds no candidate when only near-name Terriermon cards sit in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-046", dp: 6000, as: "gargomon" }],
          trash: [
            { card: "BT16-038", as: "xAntibody" },
            { card: "BT5-046", as: "assistant" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("gargomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT17-046"));

    // [Terriermon] is an exact name (§2-3-1-2): neither near-name card may be played.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT16-038", "BT17-046", "BT5-046"]);
  });

  it("naturally applies and withdraws its inherited DP aura around an attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-047", dp: 7000, under: ["BT17-046"], as: "host" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(8000);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
