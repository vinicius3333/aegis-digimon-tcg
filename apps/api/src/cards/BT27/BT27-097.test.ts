import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";
import { seatClients } from "#api/engine/testkit/seatClients";
import "#api/cards/index";

describe("Makoto Kuonji attack storage and Option use", () => {
  it.each([0, 2, 3, 5])("sets memory to three only at two or less: %i", async (memory) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT27-097", as: "tamer" }] } });
    await s.ready();
    s.state.memory = memory;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(Math.max(3, memory));
  });

  it.each([true, false])("stores both top cards face down only when accepted: %s", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-097", as: "tamer" },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      accept ? s.perm("tamer").stack.length === 2 : s.decisions.some((d) => d.req.kind === "optional"),
    );
    await advance(s.engine).finishAttack();
    expect(s.perm("tamer").isSuspended).toBe(accept);
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toEqual(
      accept ? [s.inst("second").instanceId, s.inst("first").instanceId] : [],
    );
    expect(s.perm("tamer").stack.every((c) => c.faceUp === false)).toBe(true);
  });

  it.each([0, 1] as const)("uses the matching Option only on the printed turn: %i", async (turnSeat) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-097",
              as: "tamer",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-011", faceUp: false },
              ],
            },
            ...(turnSeat === 0 ? [{ card: "BT1-010", as: "attacker" }] : []),
          ],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
          trash: [{ card: "BT26-075", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            ...(turnSeat === 1 ? [{ card: "BT1-010", as: "attacker" }] : []),
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = turnSeat;
    s.state.memory = turnSeat === 0 ? 5 : -5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    const used = s.state.players[1]!.battleArea.length === 0;
    expect(used).toBe(turnSeat === 0);
    expect(s.perm("tamer").stack).toHaveLength(turnSeat === 0 ? 0 : 4);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(turnSeat === 0 ? 5 - (turnSeat === 0 ? 1 : 0) : -5);
  });

  it("cannot pay four cards when only three are available after storage", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-097", as: "tamer", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011"],
          trash: ["BT26-075"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT1-009" || c.cardId === "BT1-011")).toHaveLength(0);
  });

  it("plays from security without paying memory", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT27-097", as: "tamer" }] } });
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toContain("BT27-097");
    expect(s.state.memory).toBe(5);
  });
  it("offers only the printed Option color and trait from the printed zone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-097",
              as: "tamer",
              under: Array.from({ length: 4 }, () => ({ card: "BT1-009", faceUp: false })),
            },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011"],
          trash: [
            { card: "BT26-075", as: "eligible" },
            { card: "BT27-067", as: "otherOptionColor" },
            { card: "BT1-104", as: "wrongTrait" },
          ],
          hand: [{ card: "BT26-075", as: "wrongZone" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    const offered = s.decisions.flatMap((d) => d.req.options?.candidateInstanceIds ?? []);
    expect(offered).toContain(s.inst("eligible").instanceId);
    for (const alias of ["otherOptionColor", "wrongTrait", "wrongZone"]) {
      expect(offered).not.toContain(s.inst(alias).instanceId);
    }
    expect(s.events.some((e) => e.kind === "cardPlayed" && e.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  it("pays bottom face-down cards across multiple Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-097", as: "tamer", under: [{ card: "BT1-009", as: "own", faceUp: false }] },
            { card: "BT1-087", as: "other", under: [{ card: "BT1-011", as: "otherBottom", faceUp: false }] },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011"],
          trash: ["BT26-075"],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("own").instanceId, s.inst("otherBottom").instanceId]),
    );
  });

  it("cannot store cards while already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-097", as: "tamer", suspended: true },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
  it("stores both cards once suspended without a second storage prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-097",
              as: "tamer",
              under: Array.from({ length: 4 }, () => ({ card: "BT1-009", faceUp: false })),
            },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011"],
          trash: [{ card: "BT26-075", as: "option" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("tamer").stack).toHaveLength(2);
    expect(s.decisions.some((d) => /^you may place/i.test(d.req.promptText ?? ""))).toBe(false);
    expect(s.events.some((e) => e.kind === "cardPlayed" && e.instanceId === s.inst("option").instanceId)).toBe(true);
  });
  it.each([0, 1, 2, 3])(
    "asks to activate, then once whether to place both top cards, with a deck of %i cards",
    async (count) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT27-097", as: "tamer" },
              { card: "BT1-010", as: "attacker" },
            ],
            deck: Array.from({ length: count }, () => "BT1-009"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
      expect(s.perm("tamer").stack).toHaveLength(Math.min(count, 2));
      expect(s.state.players[0]!.deck).toHaveLength(Math.max(count - 2, 0));
      expect(
        s.decisions.filter(
          (d) => d.req.kind === "optional" && d.req.options?.effectTextPart?.includes("place the top 2"),
        ),
      ).toHaveLength(count === 0 ? 1 : 2);
      expect(s.decisions.filter((d) => d.req.kind === "chooseOption")).toHaveLength(0);
    },
  );

  it("stores and uses the Option when your own Digimon attacks on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-097",
              as: "tamer",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-011", faceUp: false },
              ],
            },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
          security: ["BT1-009"],
          trash: [{ card: "BT26-075", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== s.perm("target").permanentId));
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("highlights each printed clause on its own prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-097",
              as: "tamer",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-011", faceUp: false },
              ],
            },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
          security: ["BT1-009"],
          trash: [{ card: "BT26-075", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== s.perm("target").permanentId));
    const parts = s.decisions.map((d) => d.req.options?.effectTextPart);
    expect(parts[0]).toBe(
      "[All Turns] When a Digimon attacks, by suspending this Tamer, you may place the top 2 cards of your deck face down under this Tamer.",
    );
    expect(parts[1]).toBe(
      "[All Turns] When a Digimon attacks, by suspending this Tamer, you may place the top 2 cards of your deck face down under this Tamer.",
    );
    expect(parts[2]).toBe(
      "After, if it's your turn, by trashing 4 bottom face-down cards from under any of your Tamers, you may use 1 purple [BEATBREAK] trait Option card from your trash with the cost reduced by 3.",
    );
    const optionPrompts = s.decisions.filter((d) => d.req.sourceCardId !== "BT27-097");
    expect(optionPrompts.every((d) => d.req.options?.effectTextPart === undefined)).toBe(true);
  });

  describe("official rulings", () => {
    it("uses no Option when the Tamer cannot be suspended to meet the condition", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT27-097",
                as: "tamer",
                suspended: true,
                under: Array.from({ length: 4 }, () => ({ card: "BT1-009", faceUp: false })),
              },
              { card: "BT1-010", as: "attacker" },
            ],
            deck: [
              { card: "BT1-011", as: "first" },
              { card: "BT1-012", as: "second" },
            ],
            trash: [{ card: "BT26-075", as: "option" }],
          },
          1: { battleArea: ["BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      s.state.memory = 5;
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
      await settle();
      expect(s.perm("tamer").stack).toHaveLength(4);
      expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([
        s.inst("first").instanceId,
        s.inst("second").instanceId,
      ]);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("option").instanceId);
      expect(s.events.some((e) => e.kind === "cardPlayed" && e.instanceId === s.inst("option").instanceId)).toBe(false);
    });

    it("places the top deck cards one at a time beneath the cards already under the Tamer", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT27-097",
                as: "tamer",
                under: [{ card: "BT1-009", as: "existing", faceUp: false }],
              },
            ],
            deck: [{ card: "BT1-011", as: "first" }, { card: "BT1-012", as: "second" }, "BT1-009"],
          },
          1: { battleArea: ["BT1-009", { card: "BT1-010", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
      await settle();
      expect(s.perm("tamer").stack.map((c) => [c.instanceId, c.faceUp])).toEqual([
        [s.inst("second").instanceId, false],
        [s.inst("first").instanceId, false],
        [s.inst("existing").instanceId, false],
      ]);
    });

    it("trashes face-down cards from the bottom in their fixed stack order and puts them face up in the trash", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT27-097",
                as: "tamer",
                under: [
                  { card: "BT1-009", as: "bottom", faceUp: false },
                  { card: "BT1-010", as: "middle", faceUp: false },
                  { card: "BT1-011", as: "top", faceUp: false },
                ],
              },
              { card: "BT1-010", as: "attacker" },
            ],
            deck: [
              { card: "BT1-012", as: "first" },
              { card: "BT2-052", as: "second" },
            ],
            trash: [{ card: "BT26-075", as: "option" }],
          },
          1: { battleArea: ["BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      s.state.memory = 5;
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
      await settle();
      const paid = ["second", "first", "bottom", "middle"].map((alias) => s.inst(alias).instanceId);
      expect(s.perm("tamer").stack.map((c) => c.instanceId)).toEqual([s.inst("top").instanceId]);
      expect(
        s.state.players[0]!.trash.filter((c) => paid.includes(c.instanceId))
          .map((c) => [c.instanceId, c.faceUp])
          .sort(),
      ).toEqual(paid.map((id) => [id, true]).sort());
      expect(s.events.some((e) => e.kind === "cardPlayed" && e.instanceId === s.inst("option").instanceId)).toBe(true);
    });

    it("shows the cards placed face down under the Tamer to their owner only", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT27-097", as: "tamer" }],
            deck: [
              { card: "BT1-011", as: "first" },
              { card: "BT1-012", as: "second" },
            ],
          },
          1: { battleArea: ["BT1-009", { card: "BT1-010", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      const clients = seatClients(s.engine, s.state);
      await s.ready();
      clients.patch();
      await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
      await settle();
      clients.patch();
      const seenStack = (seat: 0 | 1) =>
        clients
          .stateFor(seat)
          .players[0]!.battleArea.find(({ permanentId }) => permanentId === s.perm("tamer").permanentId)!
          .stack.map(({ cardId }) => cardId);
      expect(s.perm("tamer").stack.map((c) => c.faceUp)).toEqual([false, false]);
      expect(seenStack(0)).toEqual(["BT1-012", "BT1-011"]);
      expect(seenStack(1)).toEqual([undefined, undefined]);
      expect(clients.decoderErrors).toEqual([]);
      clients.restore();
    });
  });
});
