import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-046.js";
import "./index.js";

describe("BT17-046 Gargomon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-046")).toMatchObject({
      cardId: "BT17-046",
      colors: ["Green"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
    });
  });

  it("may play one Terriermon from trash on deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Terriermon"], match: "name" }] }, count: 1 },
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
        },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const terriermonId = s.inst("terriermon").instanceId;

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

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === terriermonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === terriermonId)).toBe(false);
  });

  it("naturally applies its inherited DP aura when the host attacks", async () => {
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
  });
});
