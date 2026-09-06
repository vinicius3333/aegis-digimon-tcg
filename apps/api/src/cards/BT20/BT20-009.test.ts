import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./index.js";
import { compiled } from "./BT20-009.js";

describe("BT20-009 Veemon", () => {
  it("proves purple-play triggering and optional Free digivolution from hand", () => {
    const effect = compiled.effects.find((entry) => !entry.isInherited);
    const watcher = effect?.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] },
    });
    expect(irNode(watcher)?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      reduceCost: 1,
      from: ["hand"],
      into: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
    });
  });

  it("digivolves itself into a Free Digimon for 1 less after an allied purple Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
          hand: [
            { card: "ST6-03", as: "purple" },
            { card: "BT20-011", as: "exVeemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("purple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("veemon").topCard.cardId === "BT20-011");
    expect(s.state.memory).toBe(1);

    const nonMatch = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
          hand: [
            { card: "BT20-010", as: "black" },
            { card: "BT20-011", as: "exVeemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonMatch.state.memory = 5;
    expect(nonMatch.engine.applyIntent(0, { type: "playCard", instanceId: nonMatch.inst("black").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => false, 20);
    expect(nonMatch.perm("veemon").topCard.cardId).toBe("BT20-009");
  });

  it("supports refusal, ignores an opponent's purple play, and requires a legal public evolution route", async () => {
    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
          hand: [
            { card: "ST6-03", as: "purple" },
            { card: "BT20-011", as: "candidate" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    refused.state.memory = 5;
    expect(refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("purple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(refused.perm("veemon").topCard.cardId).toBe("BT20-009");
    expect(refused.state.memory).toBe(2);

    const opponentPlay = setupEngine({
      0: {
        battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
        hand: [{ card: "BT20-011", as: "candidate" }],
      },
      1: { hand: [{ card: "ST6-03", as: "opponentPurple" }] },
    });
    opponentPlay.state.turnSeat = 1;
    await opponentPlay.ready();
    expect(
      opponentPlay.engine.applyIntent(1, {
        type: "playCard",
        instanceId: opponentPlay.inst("opponentPurple").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(opponentPlay.perm("veemon").topCard.cardId).toBe("BT20-009");
    expect(opponentPlay.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      opponentPlay.inst("candidate").instanceId,
    );
  });

  it("does not use a Free destination that is only in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
          hand: [{ card: "ST6-03", as: "purple" }],
          trash: [{ card: "BT20-011", as: "trashFree" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("purple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(s.perm("veemon").topCard.cardId).toBe("BT20-009");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashFree").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("rejects a legal red level-4 destination without the Free trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon", under: ["BT20-001"] }],
          hand: [
            { card: "ST6-03", as: "purple" },
            { card: "ST1-06", as: "nonFree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("purple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(s.perm("veemon").topCard.cardId).toBe("BT20-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonFree").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("reaches Veemon from a red egg through a public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-001", as: "egg" }, hand: [{ card: "BT20-009", as: "veemon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT20-009");
    expect(s.perm("egg").topCard.cardId).toBe("BT20-009");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT20-001"]);
  });

  it("reaches Veemon from a purple egg through a public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT15-006", as: "egg" }, hand: [{ card: "BT20-009", as: "veemon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT20-009");
    expect(s.perm("egg").topCard.cardId).toBe("BT20-009");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT15-006"]);
  });

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-011", dp: 4000, as: "host", under: ["BT20-009"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
