import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_079 } from "./BT24-079.js";
import "../index.js";

describe("BT24-079 Hadesmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-079")).toMatchObject({
      cardId: "BT24-079",
      nameEn: "Hadesmon",
      colors: ["Purple", "White"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Transmutation"],
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
    });
  });

  it("links an Appmon card to a separately selected friendly Digimon", () => {
    const main = BT24_079.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(main?.actions?.[1]).toMatchObject({
      kind: "Link",
      target: {
        filter: {
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          hostFilter: { isSelfRef: true },
        },
        count: 1,
      },
      from: ["hand", "digivolutionCards"],
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });

  it("public evolution pays 4, plays a System Digimon, and then free-links an Appmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-075", as: "base" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [
            { card: "BT24-079", as: "hadesmon" },
            { card: "BT24-036", as: "link" },
          ],
          trash: [{ card: "BT24-071", as: "system" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("system").instanceId, s.perm("recipient").topCard.instanceId, s.inst("link").instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hadesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("system").instanceId),
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("link").instanceId),
      ),
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("hadesmon").instanceId);
  });

  it("may refuse the optional System revival on a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-075", as: "base" }],
          hand: [{ card: "BT24-079", as: "hadesmon" }],
          trash: [{ card: "BT24-071", as: "system" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hadesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hadesmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("system").instanceId);
    expect(s.perm("base").linked).toHaveLength(0);
  });

  it("App Fuses from Revivemon linked with Biomon for cost 0", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: "BT24-077", as: "revivemon" },
          ],
          hand: [{ card: "BT24-038", as: "biomon" }],
          trash: [{ card: "BT24-079", as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("revivemon").topCard.instanceId, s.inst("fusion").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("biomon").instanceId,
        targetPermanentId: s.perm("revivemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("revivemon").topCard.instanceId === s.inst("fusion").instanceId);
    await settle(() => observe(s.engine).hasKeyword(s.perm("revivemon"), "Overclock"));
    await settle(() => observe(s.engine).linkMaxDelta(s.perm("revivemon")) === 1);

    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).linkMaxDelta(s.perm("revivemon"))).toBe(1);
  });

  it("uses Overclock by deleting another Appmon and attacks without suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-079", as: "hadesmon" },
            { card: "BT24-032", as: "fodder" },
          ],
        },
        1: { security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const fodderId = s.perm("fodder").permanentId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === fodderId)).toBe(false);
    expect(s.perm("hadesmon").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("plays a System Digimon and then free-links an Appmon card to a chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-079", as: "hadesmon" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT24-036", as: "link" },
          ],
          trash: [{ card: "BT24-071", as: "system" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("system").instanceId,
      s.perm("recipient").topCard.instanceId,
      s.inst("noLink").instanceId,
      s.inst("link").instanceId,
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hadesmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("system").instanceId),
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("link").instanceId),
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("link").instanceId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("only free-links from Hadesmon's own digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-079", as: "hadesmon", under: [{ card: "BT24-036", as: "ownSource" }] },
            { card: "BT21-009", as: "recipient" },
            { card: "BT24-038", as: "other", under: [{ card: "BT24-036", as: "otherSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("recipient").topCard.instanceId,
      s.inst("otherSource").instanceId,
      s.inst("ownSource").instanceId,
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hadesmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("ownSource").instanceId),
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("ownSource").instanceId),
      ),
    ).toBe(true);
  });

  it("reactivates its when-digivolving effect when another Digimon is deleted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-079", as: "hadesmon" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [{ card: "BT24-036", as: "link" }],
          trash: [{ card: "BT24-071", as: "system" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "deleted", suspended: true, dp: 3000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("system").instanceId, s.perm("recipient").topCard.instanceId, s.inst("link").instanceId);
    await s.ready();

    const deletedId = s.perm("deleted").permanentId;
    const deletedCardId = s.inst("deleted").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hadesmon").permanentId,
        target: { kind: "permanent", permanentId: deletedId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== deletedId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(deletedCardId);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("system").instanceId),
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("link").instanceId),
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("link").instanceId),
      ),
    ).toBe(true);
  });

  it("resets its deletion reactivation on the next turn through public plays", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-076", as: "ownerDeleter" }],
          battleArea: [
            { card: "BT24-079", as: "hadesmon" },
            { card: "BT1-009", as: "ownerVictim" },
          ],
          trash: [
            { card: "BT24-071", as: "firstSystem" },
            { card: "BT24-071", as: "secondSystem" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: [{ card: "BT24-076", as: "opponentDeleter" }],
          battleArea: [
            { card: "BT3-089", as: "purpleSource" },
            { card: "BT1-009", as: "opponentVictim" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        [s.inst("firstSystem").instanceId, s.inst("secondSystem").instanceId].includes(permanent.topCard.instanceId),
      ),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownerVictim").instanceId,
      ),
    ).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    const firstPlayed = s.state.players[0]!.battleArea.find((permanent) =>
      [s.inst("firstSystem").instanceId, s.inst("secondSystem").instanceId].includes(permanent.topCard.instanceId),
    )!.topCard.instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ownerDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((permanent) =>
          [s.inst("firstSystem").instanceId, s.inst("secondSystem").instanceId].includes(permanent.topCard.instanceId),
        ).length === 2,
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("opponentVictim").instanceId,
      ),
    ).toBe(false);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) =>
        [s.inst("firstSystem").instanceId, s.inst("secondSystem").instanceId].includes(permanent.topCard.instanceId),
      ).map((permanent) => permanent.topCard.instanceId),
    ).toEqual(
      expect.arrayContaining([
        firstPlayed,
        firstPlayed === s.inst("firstSystem").instanceId
          ? s.inst("secondSystem").instanceId
          : s.inst("firstSystem").instanceId,
      ]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("exposes Overclock, Link +1, and the exact Revivemon-Biomon App Fusion", async () => {
    expect(BT24_079.appFusionRequirement).toEqual([{ names: ["Revivemon", "Biomon"], cost: 0 }]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-079", as: "hadesmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("hadesmon"), "Overclock")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("hadesmon"))).toBe(1);
  });
});
