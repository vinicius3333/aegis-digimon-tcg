import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-039.js";

describe("BT23-039 Perorimon", () => {
  it("adds both distinct reveal categories and bottoms only the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-039", as: "perorimon" }],
          deck: [
            { card: "BT23-079", as: "appmon" },
            { card: "BT23-024", as: "invincible" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const appmonId = s.inst("appmon").instanceId;
    const invincibleId = s.inst("invincible").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("perorimon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([appmonId, invincibleId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(remainderId);
  });

  it("links for 1 memory, contributes 2000 DP and may suspend an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT23-039", as: "linker" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const baseDp = s.perm("host").currentDP;
    const linkerId = s.inst("linker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").linked.some((card) => card.instanceId === linkerId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
  });

  it("reveals three cards and adds one Appmon plus one Game/Invincible App Name card", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Game", "Invincible (App Name)", "Invincible"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
      ],
    });
  });

  it("carries its Appmon link cost and linked suspend trigger", () => {
    expect(compiled.linkRequirement).toEqual([{ cost: 1, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
    });
  });
});
