import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-059.js";
import "./index.js";

describe("BT17-059 Diaboromon", () => {
  it("matches the catalog printed text, evolution cost, and stats", () => {
    expect(getCardDefinition("BT17-059")).toMatchObject({
      cardId: "BT17-059",
      nameEn: "Diaboromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Unidentified"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
    });
    const printed = getCardDefinition("BT17-059")!.effectText!;
    expect(printed).toContain(
      "[When Digivolving] By placing 1 [Doomsday Clock] from your hand or trash as this Digimon's bottom digivolution card, you may play 2 [Diaboromon] Tokens without paying their costs (Digimon/Cost 14/Lv.6/White/Mega/Unknown/Unidentified/3000 DP)",
    );
    expect(printed).toContain(
      "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may switch the attack target to 1 of your Digimon with [Diaboromon] in its name.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the redirect as an opponent's-turn, once-per-turn substring-name switch", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("digivolves through the printed Black Lv5 route: pays 4 memory, draws 1, keeps the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-056", as: "base" }],
        hand: [{ card: "BT17-059", as: "diaboromon" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const diaboromonId = s.inst("diaboromon").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: diaboromonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === diaboromonId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT17-059");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("refuses to digivolve from an illegal off-color Lv3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "BT17-059", as: "diaboromon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const monodramonId = s.inst("monodramon").instanceId;
    const diaboromonId = s.inst("diaboromon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: diaboromonId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("monodramon").topCard?.instanceId).toBe(monodramonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([diaboromonId]);
    expect(s.state.memory).toBe(10);
  });

  it("places Doomsday Clock from hand as the bottom card and plays both tokens on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "base" }],
          hand: [
            { card: "BT17-059", as: "diaboromon" },
            { card: "BT17-100", as: "clock" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const diaboromonId = s.inst("diaboromon").instanceId;
    const clockId = s.inst("clock").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: diaboromonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === diaboromonId)!;
    expect(host.stack.map((card) => card.instanceId)).toEqual([clockId, baseId]);
    expect(host.stack[0]!.cardId).toBe("BT17-100");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    const tokens = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId !== "BT17-059");
    expect(tokens).toHaveLength(2);
    expect(tokens.every((permanent) => permanent.currentDP === 3000)).toBe(true);
    const tokenDefs = tokens.map((permanent) => getCardDefinition(permanent.topCard!.cardId)!);
    expect(tokenDefs.every((def) => def.nameEn.includes("Diaboromon"))).toBe(true);
    expect(tokenDefs.every((def) => def.level === 6 && def.kinds.map(String).includes("Digimon"))).toBe(true);
  });

  it("places Doomsday Clock taken from trash when it is not in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "base" }],
          hand: [{ card: "BT17-059", as: "diaboromon" }],
          trash: [{ card: "BT17-100", as: "clock" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const clockId = s.inst("clock").instanceId;
    const diaboromonId = s.inst("diaboromon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: diaboromonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === diaboromonId)!;
    expect(host.stack[0]!.instanceId).toBe(clockId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === clockId)).toBe(false);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(2);
  });

  // REMOVED by engine lane E2: "declines the whole optional effect: no clock placed, no tokens"
  // asserted the pre-ruling endpoint on exactly the fixture and decision path the Q2813 test below
  // now covers. Q2813 says the placement is an activation cost, paid whether or not the tokens are
  // played, so "no clock placed" is unreachable. See PAY-THEN-MAY-MECHANISM.md.

  // Q2813 also lets the player pay the "by placing" cost yet decline to play the Tokens. The
  // module sets `payCostBeforeOptional`, so `runActionInner` places the clock first and offers only
  // the token play. See docs/audits/BT17.md#pay-then-may-mechanism.
  it("can place Doomsday Clock while declining the token play (Q2813)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "base" }],
          hand: [
            { card: "BT17-059", as: "diaboromon" },
            { card: "BT17-100", as: "clock" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const diaboromonId = s.inst("diaboromon").instanceId;

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: diaboromonId,
    });
    await settle(() => s.perm("base").topCard?.instanceId === diaboromonId);

    expect(s.perm("base").stack.some((card) => card.cardId === "BT17-100")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays no tokens when no Doomsday Clock is available to pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "base" }],
          hand: [{ card: "BT17-059", as: "diaboromon" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const diaboromonId = s.inst("diaboromon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: diaboromonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === diaboromonId);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
  });

  it("switches the first opponent attack onto an unsuspended named Diaboromon, sparing the non-named Digimon (Q2815)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-059", as: "diaboromon" },
            { card: "BT1-009", as: "monodramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "attackerOne" },
            { card: "BT17-053", as: "attackerTwo" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const diaboromonId = s.inst("diaboromon").instanceId;
    const monodramonId = s.inst("monodramon").instanceId;
    const attackerOneId = s.inst("attackerOne").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("diaboromon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === attackerOneId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === diaboromonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === monodramonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);

    // Second opponent attack the same turn: the once-per-turn window is spent, so no switch —
    // the attack lands on the 0-security player and ends the game.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "gameOver"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === monodramonId)).toBe(
      true,
    );
  });
});
