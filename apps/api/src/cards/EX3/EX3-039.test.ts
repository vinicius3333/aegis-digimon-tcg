import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-074.js";
import "./EX3-039.js";

describe("EX3-039 Coredramon", () => {
  it("has the official identity and both printed evolution requirements", () => {
    expect(getCardDefinition("EX3-039")).toMatchObject({
      cardId: "EX3-039",
      nameEn: "Coredramon",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dragon"],
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "EX3-039",
    });
  });

  it("digivolves from Dracomon for the alternate cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-037", as: "dracomon" }],
        hand: [{ card: "EX3-039", as: "coredramon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dracomon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dracomon").topCard.cardId === "EX3-039");

    expect(s.state.memory).toBe(0);
    expect(s.perm("dracomon").stack.map(({ cardId }) => cardId)).toContain("EX3-037");
  });

  it("uses the printed cost 3 from a blue level 3 that isn't Dracomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "gabumon" }],
        hand: [{ card: "EX3-039", as: "coredramon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.cardId === "EX3-039");

    expect(s.state.memory).toBe(0);
  });

  it("uses the printed cost 3 from a green level 3 that isn't Dracomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "goblimon" }],
        hand: [{ card: "EX3-039", as: "coredramon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard.cardId === "EX3-039");

    expect(s.state.memory).toBe(0);
  });

  it("accepts the name-based alternate cost for Dracomon X and an off-color Dracomon", async () => {
    for (const baseCard of ["BT21-046", "BT20-007"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "dracomon" }],
          hand: [{ card: "EX3-039", as: "coredramon" }],
          deck: ["BT1-010"],
        },
      });
      s.state.memory = 2;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("dracomon").permanentId,
          instanceId: s.inst("coredramon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("dracomon").topCard.cardId === "EX3-039");

      expect(s.state.memory).toBe(0);
    }
  });

  it("its printed Blocker redirects a player attack and remains visibly suspended after surviving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX3-039", as: "coredramon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();
    const blockerId = s.perm("coredramon").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("coredramon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [blockerId],
    });
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.perm("coredramon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Dragon family: inherited Blocker applies to Dramon and Examon names but not an unrelated host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
      1: {
        battleArea: [
          { card: "EX3-020", under: ["EX3-039"], as: "wingdramon" },
          { card: "EX3-074", under: ["EX3-039"], as: "examon" },
          { card: "BT1-038", under: ["EX3-039"], as: "unrelated" },
        ],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("wingdramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);

    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    const blockWindow = s.events.find(({ kind }) => kind === "blockWindowOpened");
    expect(blockWindow).toMatchObject({
      eligibleBlockerIds: expect.arrayContaining([s.perm("wingdramon").permanentId, s.perm("examon").permanentId]),
    });
    expect(blockWindow).not.toMatchObject({
      eligibleBlockerIds: expect.arrayContaining([s.perm("unrelated").permanentId]),
    });

    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("wingdramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.perm("wingdramon").isSuspended).toBe(true);
    expect(s.perm("examon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("recomputes inherited Blocker when Armor Purge promotes a Dramon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-074",
              under: ["EX3-039", "EX3-020"],
              as: "host",
            },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    const armorId = s.perm("host").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [armorId] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Blocker"));

    expect(s.perm("host").topCard.cardId).toBe("EX3-020");
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("lets the defending player decline its printed Blocker and take the security attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX3-039", as: "coredramon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("coredramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("cannot block while Coredramon is already suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX3-039", suspended: true, as: "coredramon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.events.filter(({ kind }) => kind === "blockWindowOpened")).toHaveLength(0);
    expect(s.perm("coredramon").isSuspended).toBe(true);
  });
});
