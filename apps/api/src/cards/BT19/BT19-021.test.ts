import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../EX12/EX12-031.js";
import { compiled } from "./BT19-021.js";

describe("BT19-021 Xiquemon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-021")).toMatchObject({
      cardId: "BT19-021",
      nameEn: "Xiquemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Avian", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      effectText:
        "[On Play] [When Digivolving] Return 1 of your opponent's level 3 Digimon to the hand.  [Rule] Trait: Has the [Aquatic] type.",
      inheritedEffectText: "＜Jamming＞.",
    });
  });

  it("compiles every printed clause", () => {
    for (const [index, trigger] of [
      [0, "OnPlay"],
      [1, "WhenDigivolving"],
    ] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger,
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levels: [3] } },
          },
        ],
      });
    }
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          grant: "trait",
          tokens: ["Aquatic"],
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
    });
    expect(compiled.effects).toHaveLength(4);
  });

  it("digivolves from a Blue Lv.3 for 2, drawing the bonus card and firing When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "base" }],
          hand: [{ card: "BT19-021", as: "xique" }],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-027", as: "opponentLv3" },
            { card: "BT19-019", as: "opponentLv4" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const returnedInstanceId = s.inst("opponentLv3").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xique").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    await settle(() => false, 30);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-021");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(5000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([returnedInstanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-019"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Green Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "green" }],
        hand: [{ card: "BT19-021", as: "xique" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-027", as: "opponentLv3" }], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("xique").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("green").topCard?.cardId).toBe("BT1-064");
    expect(s.perm("green").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("returns exactly one opposing level-3 Digimon when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ownLv3" }],
          hand: [{ card: "BT19-021", as: "xique" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-027", as: "opponentLv3" },
            { card: "BT19-019", as: "opponentLv4" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const ownLv3PermanentId = s.perm("ownLv3").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xique").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(ownLv3PermanentId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("opponentLv3").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-019"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when the opponent controls no level-3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ownLv3" }],
          hand: [{ card: "BT19-021", as: "xique" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT19-019", as: "opponentLv4" }], security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xique").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => false, 30);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-019"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is always [Aquatic] without granting the trait to a peer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-021", as: "xique" },
          { card: "BT19-020", as: "nearMiss" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("xique"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("nearMiss"), "Aquatic")).toBe(false);
  });

  it("satisfies a real [Aquatic] digivolution gate that the near-miss Lv.4 does not", async () => {
    for (const [baseCardId, expectedCost] of [
      ["BT19-021", 3],
      ["BT19-020", 4],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCardId, as: "base" }],
            hand: [{ card: "EX12-031", as: "marine" }],
            deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
            security: ["BT1-009", "BT1-013"],
          },
          1: { security: ["BT1-009", "BT1-013"] },
        },
        { autoSelectCards: true, autoDeclineOptional: true, autoChooseOption: true },
      );
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("marine").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));
      await settle(() => false, 30);

      expect(s.perm("base").topCard?.cardId).toBe("EX12-031");
      expect(s.state.memory).toBe(4 - expectedCost);
    }
  });

  it("keeps its host alive against a Security Digimon that beats it, while a plain host dies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-023", as: "host", dp: 3000, under: ["BT19-021"] },
            { card: "BT19-023", as: "plainHost", dp: 3000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-013", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Jamming")).toBe(false);
    const hostPermanentId = s.perm("host").permanentId;
    const plainHostPermanentId = s.perm("plainHost").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostPermanentId)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: plainHostPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === plainHostPermanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-023"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not grant ＜Jamming＞ to a Digimon that is not its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-023", as: "host", under: ["BT19-021"] },
          { card: "BT19-023", as: "plainHost" },
          { card: "BT19-021", as: "onTop" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("onTop"), "Jamming")).toBe(false);
  });
});
