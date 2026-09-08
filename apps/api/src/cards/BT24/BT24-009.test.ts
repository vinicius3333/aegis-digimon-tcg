import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-009.js";
import "../index.js";

describe("BT24-009 Shamanmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-009")).toMatchObject({
      cardId: "BT24-009",
      nameEn: "Shamanmon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      types: ["Demon", "Titan", "TS"],
    });
  });

  it("requires trashing the qualifying hand card before drawing two", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions?.[0]).toMatchObject({
      actions: [
        {
          target: { filter: { isSelfRef: true }, isSelf: true },
          condition: { kind: "selfHasTrait" },
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          useAlternateCost: true,
          reduceCost: 1,
          optional: true,
        },
      ],
    });
  });

  it("resolves the On Play clause from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-009", as: "shamanmon" },
            { card: "BT24-009", as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "drawOne" },
            { card: "BT1-010", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shamanmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawOne").instanceId, s.inst("drawTwo").instanceId]),
    );
  });

  it("records both zero-cost alternate evolution recipes", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
  });

  it("may trash a Demon card to draw two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-009", as: "shamanmon" },
            { card: "BT24-009", as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "drawOne" },
            { card: "BT1-010", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shamanmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawOne").instanceId, s.inst("drawTwo").instanceId]),
    );
  });

  it("may decline the On Play trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-009", as: "shamanmon" },
            { card: "BT24-009", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shamanmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("shamanmon").topCard.instanceId === s.inst("shamanmon").instanceId);

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard.instanceId)).toContain(
      s.inst("shamanmon").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(7);
  });

  it("digivolves its Titan host into Titamon from trash with cost reduced by one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
          hand: [{ card: "BT1-009", as: "discard" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.memory).toBe(3);
  });

  it("inherits from a public play discard and evolves its Demon/Titan host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "P-209");
    expect(s.state.memory).toBe(4);
  });

  it("does not retroactively open Alliance when attack-time hand trash evolves a legal Titan host (Q5579)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009", "ST16-03"] }],
          hand: [{ card: "BT1-009", as: "drawnTrash" }],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-013"], deck: ["BT1-014", "BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-209" && !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("drawnTrash").instanceId);
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("may decline the inherited evolution after a public hand discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId));

    expect(s.perm("host").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discarded").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("suppresses a second public discard evolution and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-010", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder1" },
            { card: "BT24-026", as: "discarder2" },
            { card: "BT24-026", as: "discarder3" },
            { card: "BT1-009", as: "discarded1" },
            { card: "BT1-010", as: "discarded2" },
            { card: "BT1-011", as: "discarded3" },
          ],
          trash: [
            { card: "BT24-072", as: "firstTarget" },
            { card: "P-209", as: "secondTarget" },
          ],
          deck: [
            { card: "BT1-012", as: "draw1" },
            { card: "BT1-013", as: "draw2" },
            { card: "BT1-014", as: "draw3" },
          ],
        },
        1: { deck: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("discarded1").instanceId,
      s.inst("discarded2").instanceId,
      s.inst("discarded3").instanceId,
      s.inst("firstTarget").instanceId,
      s.inst("secondTarget").instanceId,
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("firstTarget").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discarded1").instanceId);
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded2").instanceId));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTarget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondTarget").instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 20;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("secondTarget").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discarded3").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("rejects a public play by the non-active opponent instead of opening this owner's trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
        hand: [
          { card: "BT24-026", as: "discarder" },
          { card: "BT24-009", as: "discarded" },
        ],
        trash: [{ card: "P-209", as: "titamon" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId }).ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("discarder").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("titamon").instanceId);
  });

  it("does not inherited-evolve a host lacking Demon or Titan", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId));
    expect(s.perm("host").topCard.cardId).toBe("BT24-046");
  });

  it("accepts the named Tsunomon route from a non-TS egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "ST2-01", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["ST2-01"]);
  });

  it("also accepts the level-2 TS alternate recipe from the public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT24-004", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
  });

  it("proves the public egg-to-Shamanmon-to-Fugamon route, cost, stack, and bonus draw", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-004", as: "egg" },
        hand: [
          { card: "BT24-009", as: "shaman" },
          { card: "BT24-013", as: "fugamon" },
        ],
        deck: [
          { card: "BT1-012", as: "bonusDraw1" },
          { card: "BT1-013", as: "bonusDraw2" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("shaman").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-004"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw1").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("fugamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("fugamon").instanceId);
    expect(s.perm("egg").topCard.cardId).toBe("BT24-013");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-004", "BT24-009"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw2").instanceId);
  });

  it("rejects the named Tsunomon alternate route from a non-Tsunomon egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT24-004", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    expect(s.perm("egg").topCard.cardId).toBe("BT24-004");
  });
});
