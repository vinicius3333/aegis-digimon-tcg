import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-108.js";
import "./BT9-108.js";

describe("BT9-108 Eye of the Gorgon", () => {
  it("matches catalog values and conditional bound replay, suppression, and security IR", () => {
    expect(getCardDefinition("BT9-108")).toMatchObject({
      colors: ["Purple"], kinds: ["Option"], playCost: 8,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "Delete", target: { filter: { unsuspended: true }, bindResultAs: "deleted" } },
            { kind: "PlayWithoutCost", from: ["trash"], payCost: false, bindResultAs: "playedByGorgon", condition: { kind: "bindingExists", ref: "deleted" } },
            { kind: "DisableTimingEffect", timings: ["onPlay"], target: { filter: { boundRef: "playedByGorgon" } }, condition: { kind: "bindingExists", ref: "playedByGorgon" } },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("deletes an unsuspended Digimon, plays a purple level 3, and suppresses On Play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT9-070"],
          hand: [{ card: "BT9-108", as: "option" }],
          trash: [{ card: "BT9-071", as: "revived" }],
          deck: ["BT9-073", "BT9-074", "BT9-076"],
        },
        1: { battleArea: [{ card: "BT9-045", as: "deleteTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("revived").instanceId,
        ),
    );

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play from trash when no unsuspended Digimon was deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT9-070"],
          hand: [{ card: "BT9-108", as: "option" }],
          trash: [{ card: "BT9-071", as: "mustStayInTrash" }],
        },
        1: { battleArea: [{ card: "BT9-045", suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT9-108"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mustStayInTrash").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
