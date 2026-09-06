import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-004.js";
import "../index.js";

describe("BT21-004 Koromon", () => {
  it("encodes the inherited once-per-turn trigger for one of your red or yellow Tamers", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["red", "BT1-085"],
    ["yellow", "BT1-087"],
    ["red/yellow", "BT12-092"],
  ])("draws when your %s Tamer suspends", async (_label, tamer) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          { card: tamer, as: "tamer" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("tamer").permanentId,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-004"]);
  });

  it("draws through the natural Haru suspension caused by a public link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-004", as: "host" },
            { card: "BT21-084", as: "haru1" },
            { card: "BT21-084", as: "haru2" },
          ],
          hand: [
            { card: "BT21-009", as: "evolved" },
            { card: "BT21-009", as: "link" },
          ],
          deck: [
            { card: "BT1-004", as: "evolutionBonus" },
            { card: "BT1-001", as: "haruDrawn" },
            { card: "BT1-002", as: "haru2Drawn" },
            { card: "BT1-003", as: "koromonDrawn" },
            { card: "BT1-005", as: "sentinel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolved").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionBonus").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 4);

    expect(s.perm("haru1").isSuspended).toBe(true);
    expect(s.perm("haru2").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("haruDrawn").instanceId,
        s.inst("haru2Drawn").instanceId,
        s.inst("koromonDrawn").instanceId,
      ]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
    expect(s.state.memory).toBe(4);
  });

  it("draws when public Marcus play suspends a yellow/red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "host", under: ["BT21-004"] }],
          hand: [{ card: "BT21-086", as: "marcus" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.perm("marcus").isSuspended).toBe(true);
  });

  it("does not draw from a public opponent suspension of a blue Tamer or red Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "host", under: ["BT21-004"] },
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-009", as: "redDigimon" },
          ],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: {
          battleArea: [{ card: "BT20-045", as: "examon" }],
          hand: [{ card: "BT21-052", as: "examonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("examon").permanentId,
        instanceId: s.inst("examonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("examon").topCard.cardId === "BT21-052");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("refuses the public suspension cost when the only target is a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "host", under: ["BT21-004"] },
            { card: "BT21-045", as: "attacker" },
            { card: "BT1-086", as: "blueTamer" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("blueTamer").isSuspended).toBe(false);
  });

  it("refuses the public suspension cost when the only target is a red Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "host", under: ["BT21-004"] },
            { card: "BT21-045", as: "attacker" },
            { card: "BT1-009", as: "redDigimon" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("redDigimon").isSuspended).toBe(false);
  });

  it.each([
    ["your blue Tamer", 0, "BT1-086"],
    ["your red Digimon", 0, "BT1-009"],
    ["an opponent red Tamer", 1, "BT1-085"],
  ])("does not draw for %s", async (_label, seat, card) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          ...(seat === 0 ? [{ card, as: "subject" }] : []),
        ],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { battleArea: seat === 1 ? [{ card, as: "subject" }] : [] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("subject").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when multiple matching Tamers suspend in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          { card: "BT1-085", as: "red" },
          { card: "BT1-087", as: "yellow" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("red").permanentId });
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("yellow").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
