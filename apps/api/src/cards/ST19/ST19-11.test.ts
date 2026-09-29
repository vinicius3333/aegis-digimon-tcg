import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT19/BT19-092.js";
import "../ST2/ST2-16.js";
import "./ST19-12.js";
import "./ST19-11.js";

describe("ST19-11 Chaperomon", () => {
  it("reduces one opposing Digimon by 3000 with fewer than three total Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST19-11", as: "chap" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chap").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("reduces the same target by 6000 when both players have three total Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST19-11", as: "chap" }], battleArea: [{ card: "BT1-010", as: "ally" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chap").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("matches the KB-defined inherited replacement clause", () => {
    expect(getCardDefinition("ST19-11")).toMatchObject({
      inheritedEffectText: expect.stringContaining("When this Digimon would leave the battle area"),
    });
  });

  it("pays the inherited leave-play replacement with a Token and preserves Chaperomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "chap", under: ["ST19-11"] },
            { card: "TOKEN-Familiar-Token", as: "fodder", dp: 3000 },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    s.state.turnSeat = 1;
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("chap").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Familiar-Token"),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Familiar-Token"),
    ).toBe(false);
  });
});

describe("ST19-11 Chaperomon — KB Q&A rulings", () => {
  it("counts both players' Digimon toward the 3-Digimon condition (Q857)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-11", as: "chaperomon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 10000 },
            { card: "BT1-010", as: "bystander", dp: 10000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaperomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("bystander").currentDP).toBe(10000);
  });

  it("applies only -3000 DP when both players have 2 Digimon in total (Q857)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST19-11", as: "chaperomon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaperomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 7000);
    await s.ready();

    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("gives the one chosen Digimon a total of -6000 DP when digivolving (Q858)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST19-07", as: "base" }],
          hand: [{ card: "ST19-11", as: "chaperomon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 10000 },
            { card: "BT1-010", as: "bystander", dp: 10000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaperomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    await s.ready();

    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("bystander").currentDP).toBe(10000);
  });

  it("prevents leaving the battle area when an opponent's effect returns it to the hand (Q859)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["ST19-11"] },
            { card: "TOKEN-Familiar-Token", as: "fodder" },
          ],
        },
        1: { hand: [{ card: "ST2-16", as: "bounce" }], battleArea: ["ST2-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const fodderId = s.perm("fodder").permanentId;
    const hostTopId = s.perm("host").topCard.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === fodderId) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "ST2-16"),
    );
    await s.ready();

    expect(s.decisions.some(({ seat, req }) => seat === 0 && req.sourceCardId === "ST19-11")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === hostTopId)).toBe(false);
  });

  it("prevents leaving the battle area when an opponent's effect returns it to the deck (Q859)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST19-10", as: "host", under: ["ST19-11"] },
            { card: "TOKEN-Familiar-Token", as: "fodder" },
          ],
        },
        1: { hand: [{ card: "BT19-092", as: "bottomDeck" }], battleArea: ["ST2-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const fodderId = s.perm("fodder").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bottomDeck").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === fodderId) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT19-092"),
    );
    await s.ready();

    expect(s.decisions.some(({ seat, req }) => seat === 0 && req.sourceCardId === "ST19-11")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("leaves the battle area when no Token or other [Puppet] Digimon can be deleted (Q859)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["ST19-11"] }] },
        1: { hand: [{ card: "ST2-16", as: "bounce" }], battleArea: ["ST2-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const hostTopId = s.perm("host").topCard.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === hostTopId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
