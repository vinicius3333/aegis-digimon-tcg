import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-039.js";

describe("BT23-039 Perorimon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-039")).toMatchObject({
      cardId: "BT23-039",
      nameEn: "Perorimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Entertainment"],
      types: ["Gourmet"],
      linkDp: 2000,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ cost: 1, traits: ["Appmon"] }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

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

  it("may refuse the linked suspend without undoing the paid link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT23-039", as: "linker" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const linkerId = s.inst("linker").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === linkerId));
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
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

  it("digivolves for 0 from an off-color level-2 Appmon and rejects a non-Appmon peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-039", as: "perorimon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("perorimon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT23-039", as: "perorimon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("perorimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
