import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-008.js";
import "./BT10-009.js";
import "./BT10-013.js";
import "./BT10-029.js";
import "./BT10-034.js";
import "./BT10-049.js";
import "./BT10-060.js";
import "./BT10-087.js";
import "./BT10-111.js";

describe("BT10 Xros Heart / Shoutmon King Version deck", () => {
  it("DigiXroses with Ballistamon, recovers X4, then Material Saves Ballistamon under Taiki", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-087", as: "taiki" },
            { card: "BT10-049", as: "ballistamon" },
          ],
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [{ card: "BT10-009", as: "shoutmonX4" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ballistamonId = s.perm("ballistamon").topCard.instanceId;
    const recoveredId = s.inst("shoutmonX4").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kingVersion").instanceId,
        digiXros: { materialInstanceIds: [ballistamonId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === recoveredId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) =>
            permanent.topCard.cardId === "BT10-111" &&
            permanent.stack.some((card) => card.instanceId === ballistamonId),
        ),
      5000,
    );
    await settle();

    const king = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-111")!;
    expect(s.state.memory).toBe(2);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(king, "MaterialSave")).toBe(1);

    await advance(s.engine).verb.deletePermanent([king.permanentId], "byEffect");
    await settle(() => s.perm("taiki").stack.some((card) => card.instanceId === ballistamonId));

    expect(s.perm("taiki").stack.some((card) => card.instanceId === ballistamonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-111")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === recoveredId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("moves X4's materials under Taiki at end of attack, then reuses them for X5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-087", as: "taiki", suspended: true },
            {
              card: "BT10-009",
              as: "shoutmonX4",
              under: [
                { card: "BT10-008", as: "shoutmon" },
                { card: "BT10-049", as: "ballistamon" },
                { card: "BT10-034", as: "dorulumon" },
                { card: "BT10-029", as: "starmons" },
              ],
            },
          ],
          hand: [
            { card: "BT10-013", as: "shoutmonX5" },
            { card: "BT10-060", as: "sparrowmon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          security: ["BT1-003"],
          deck: ["BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    const x4Id = s.perm("shoutmonX4").permanentId;
    const reusableMaterialIds = [
      s.inst("shoutmon").instanceId,
      s.inst("ballistamon").instanceId,
      s.inst("dorulumon").instanceId,
      s.inst("starmons").instanceId,
    ];
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: x4Id,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x4Id) &&
        reusableMaterialIds.every((instanceId) => s.perm("taiki").stack.some((card) => card.instanceId === instanceId)),
      5000,
    );

    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-009")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmonX5").instanceId,
        digiXros: {
          materialInstanceIds: [...reusableMaterialIds, s.inst("sparrowmon").instanceId],
          expanderPermanentIds: [s.perm("taiki").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT10-013" && permanent.stack.length === 5,
      ),
    );

    const x5 = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-013")!;
    expect(x5.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([...reusableMaterialIds, s.inst("sparrowmon").instanceId]),
    );
    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(s.perm("taiki").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
