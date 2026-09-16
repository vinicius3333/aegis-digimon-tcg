import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-001.js";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("EX13-001 Gigimon", () => {
  it("matches every catalog field and the complete compiled clause", () => {
    expect(getCardDefinition("EX13-001")).toMatchObject({
      cardId: "EX13-001",
      set: "EX13",
      nameEn: "Gigimon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      playCost: -1,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
    });
    expect(getCardDefinition("EX13-001")?.effectText).toBeUndefined();
    expect(getCardDefinition("EX13-001")?.securityEffectText).toBeUndefined();
    expect(getCardDefinition("EX13-001")?.inheritedEffectText).toBe(
      "[Your Turn] [Once Per Turn] When any of your red Tamers are played, this Digimon may digivolve into a Digimon card with [Growlmon] or [Gallantmon] in its name in the hand with the cost reduced by 2.",
    );

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true, kind: ["Digimon"] }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Growlmon"], match: "name" },
                  { tokens: ["Gallantmon"], match: "name" },
                ],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("digivolves the host into a [Growlmon] card from hand for 2 less when a red Tamer is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const growlmonInstanceId = s.inst("growlmon").instanceId;
    const tamerInstanceId = s.inst("tamer").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamerInstanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(growlmonInstanceId);
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId]);
    expect(host?.stack[0]?.cardId).toBe("EX13-001");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === tamerInstanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3 - 0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === growlmonInstanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("spare").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("charges the unreduced cost of 2 for the same evolution with no Tamer played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("growlmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");
    expect(s.state.memory).toBe(10 - 2);
  });

  it("takes the [Gallantmon] branch and charges exactly 1 of the printed 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-09", as: "gallantmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const gallantmonInstanceId = s.inst("gallantmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-09");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(gallantmonInstanceId);
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId]);
    expect(s.state.memory).toBe(10 - 3 - 1);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a legal-to-digivolve hand card whose name is neither Growlmon nor Gallantmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a matching Growlmon that sits in the trash instead of the hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-020", as: "spare" },
          ],
          trash: [{ card: "ST7-05", as: "growlmon" }],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for a non-red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT1-086", as: "blueTamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-086"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 4);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for a red Digimon (not a Tamer) being played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT1-013", as: "redDigimon" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("redDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-013"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for the opponent's red Tamer played on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-020", as: "oppSpare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(1);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for the opponent's red Tamer played from security during its own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX13-001"] },
            { card: "BT1-024", as: "attacker" },
          ],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: ["BT2-084"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084")).toBe(true);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for its controller's own red Tamer played from security on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
          security: ["BT2-084"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-020", as: "oppSpare" }],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084")).toBe(true);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the board untouched when the controller declines the optional digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does nothing when Gigimon is not among the host's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires once per turn and resets on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer1" },
            { card: "BT2-084", as: "tamer2" },
            { card: "BT2-084", as: "tamer3" },
            { card: "ST7-05", as: "growlmon" },
            { card: "ST7-08", as: "warGrowlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, hand: [{ card: "BT1-020", as: "oppSpare" }], security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const growlmonInstanceId = s.inst("growlmon").instanceId;
    const warGrowlmonInstanceId = s.inst("warGrowlmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");
    expect(s.perm("host").topCard.instanceId).toBe(growlmonInstanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT2-084").length === 2);
    expect(s.perm("host").topCard.instanceId).toBe(growlmonInstanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === warGrowlmonInstanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "ST7-08");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(warGrowlmonInstanceId);
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId, growlmonInstanceId]);
    expect(host?.stack[0]?.cardId).toBe("EX13-001");
    expect(s.state.memory).toBe(10 - 3 - 1);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses name-matching hand cards that have no legal digivolution route from the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-09", as: "gallantmon" },
            { card: "ST7-08", as: "warGrowlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warGrowlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
