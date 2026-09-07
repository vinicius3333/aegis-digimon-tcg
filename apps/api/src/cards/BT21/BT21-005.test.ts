import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-005.js";
import "../index.js";

describe("BT21-005 Swipemon", () => {
  it("encodes the inherited once-per-turn trigger only for this Digimon getting linked", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("draws when the realistic Swipemon evolution stack gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-005", as: "host" }],
          hand: [
            { card: "BT21-009", as: "gatchmon" },
            { card: "BT21-018", as: "dogatchmon" },
            { card: "BT21-018", as: "link" },
            { card: "BT21-018", as: "link2" },
          ],
          deck: [
            { card: "BT1-003", as: "bonus1" },
            { card: "BT1-004", as: "bonus2" },
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "sentinel" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("gatchmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dogatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("dogatchmon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("sentinel").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link2").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-005", "BT21-009"]);
  });

  it("draws when the stack gets linked through the public link action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-005", "BT21-009"] }],
          hand: [
            { card: "BT21-018", as: "link" },
            { card: "BT21-018", as: "link2" },
          ],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "remaining" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link2").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("ignores a public link onto another legal Appmon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "host", under: ["BT21-005", "BT21-009"] },
            { card: "BT21-018", as: "otherHost", under: ["BT21-009"] },
          ],
          hand: [
            { card: "BT21-018", as: "otherLink" },
            { card: "BT21-018", as: "ownLink" },
          ],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "sentinel" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("otherLink").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.some((card) => card.instanceId === s.inst("otherLink").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("sentinel").instanceId,
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("ownLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
  });

  it("rejects a public link attempt for this card during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-005", "BT21-009"] }],
        hand: [{ card: "BT21-018", as: "link" }],
        deck: [{ card: "BT1-001", as: "sentinel" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    // A player's linkCard intent cannot legally be created during the opponent's turn;
    // verify the public action is rejected before the inherited whenLinked event exists.
    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("link").instanceId,
      targetPermanentId: s.perm("host").permanentId,
    });
    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
  });

  it("ignores another Digimon getting linked and draws only once for its own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "host", under: ["BT21-005"] },
            { card: "BT21-009", as: "other" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when its stack gets linked during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-005"] }],
        deck: ["BT1-001"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
