import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// Inert main-deck Digimon (no printed or inherited text) for deck/security padding: no
// Digi-Egg may sit in either zone, and a numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("BT19-034 Kyubimon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-034")).toMatchObject({
      cardId: "BT19-034",
      nameEn: "Kyubimon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mysterious Beast"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Rika Nonaka] from your hand without paying the cost.",
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When you use Option cards with a cost of 2 or more, 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
  });

  it("digivolves from a yellow Lv3 for 2 memory, stacks the source, draws 1, and plays Rika free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT19-083", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-083"));

    // Endpoints: cost 2 paid, evolution bonus draw taken, source under the new top card,
    // Rika on the board and out of hand, and no memory spent playing her.
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("kyubi").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-050"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("rika").topCard?.cardId).toBe("BT19-083");
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("only plays the exact [Rika Nonaka] and leaves the near-miss [Erika Mishima] in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT23-084", as: "erika" },
            { card: "BT19-083", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-083"));

    expect(s.perm("rika").topCard?.cardId).toBe("BT19-083");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("erika").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-084")).toBe(false);
  });

  it("does not play Rika while 2 Tamers are already out", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }, { card: "BT19-081" }, { card: "BT17-085" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT19-083", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-034");
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rika").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.memory).toBe(1);
  });

  it("leaves Rika in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT19-083", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-034");
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rika").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("refuses an illegal evolution source (red Lv3, and yellow Lv4)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "redLv3" },
          { card: "BT9-035", as: "yellowLv4" },
        ],
        hand: [{ card: "BT19-034", as: "kyubi" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLv3").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowLv4").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("runs the inherited Option watcher from a real Lv3 -> Kyubimon -> Lv5 stack, once per turn", async () => {
    const pinned: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT1-057", as: "sirenmon" },
            { card: "BT1-102", as: "firstOption" },
            { card: "BT1-102", as: "secondOption" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "target" },
            { card: "BT1-013", as: "bystander" },
          ],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: pinned },
    );
    // Pin the -2000 on one named opponent Digimon so "exactly one" is asserted by identity.
    pinned.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-034");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-057");
    // The stack really carries Kyubimon under a Lv5 host, bottom-most first.
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-050", "BT19-034"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    await settle();
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("bystander").currentDP).toBe(5000); // BT1-013's printed DP, untouched

    // [Once Per Turn]: a second cost-2 Option in the same turn changes nothing.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    await settle();
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("bystander").currentDP).toBe(5000);
  });

  it("resets the once-per-turn limit on the next own turn and never fires on the opponent's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-050", "BT19-034"] }],
          hand: [
            { card: "BT1-102", as: "firstOption" },
            { card: "BT1-102", as: "secondOption" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER, ...FILLER],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's real turn: "for the turn" expires and nothing re-applies it.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Back on our own turn the once-per-turn allowance is fresh.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an Option whose own use cost is below 2 and fires once it is 2 or more (Q5466)", async () => {
    // BT7-100's use cost IS the number of your security cards - a card-level change to the
    // use cost itself, so the threshold reads the changed value (Q5466). Its own [Main]
    // effect always gives an opponent Digimon -3000 DP, which is the control: only the extra
    // -2000 belongs to Kyubimon.
    const cheap = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-050", "BT19-034"] }],
          hand: [
            { card: "BT7-100", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    cheap.state.memory = 6;
    await cheap.ready();
    expect(cheap.engine.applyIntent(0, { type: "playCard", instanceId: cheap.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => cheap.perm("target").currentDP === 3000);
    await settle();
    expect(cheap.state.memory).toBe(5); // paid the changed use cost of 1
    expect(cheap.perm("target").currentDP).toBe(3000); // only BT7-100's own -3000

    const costly = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-050", "BT19-034"] }],
          hand: [
            { card: "BT7-100", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    costly.state.memory = 6;
    await costly.ready();
    expect(costly.engine.applyIntent(0, { type: "playCard", instanceId: costly.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => costly.perm("target").currentDP === 1000);
    expect(costly.state.memory).toBe(3); // paid the changed use cost of 3
    expect(costly.perm("target").currentDP).toBe(1000); // -3000 from BT7-100, -2000 from Kyubimon
  });

  it("still fires when only the cost to pay was reduced, after the Option's own effect (Q5464, Q5467)", async () => {
    // BT21-093 keeps a printed use cost of 8 and reduces only what is PAID (by 4 while the
    // opponent has 3 or fewer security cards), so the threshold still reads 8. Its [Main]
    // deletes the opponent's highest-DP Digimon first, so the -2000 can only land on the
    // survivor - which is also the Q5464 ordering proof.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-057", as: "host", under: ["BT1-050", "BT19-034"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "BT21-093", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "highest" },
            { card: "BT1-014", as: "survivor" },
          ],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("survivor").currentDP === 2000);

    expect(s.state.memory).toBe(2); // use cost 8 printed, 4 actually paid
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.perm("survivor").currentDP).toBe(2000);
  });

  it("fires for an Option used without paying its cost at all (Q5468)", async () => {
    // BT4-089's [When Digivolving] USES a purple Option from hand without paying it. The
    // printed use cost of 2 still arms the watcher even though no memory changes hands.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "base", under: ["BT19-034"] }],
          hand: [
            { card: "BT4-089", as: "plutomon" },
            { card: "BT2-108", as: "option" },
          ],
          deck: [...FILLER, ...FILLER],
          trash: [{ card: "BT2-067", as: "revived" }],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("plutomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    await settle();

    expect(s.state.memory).toBe(6); // only the digivolution cost of 4; the Option was free
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-108")).toBe(true);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("does not fire for an Option resolving as a security effect on the opponent's turn (Q5465)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-050", "BT19-034"] }],
          deck: [...FILLER, ...FILLER],
          security: [{ card: "BT1-102", as: "securityOption" }, ...SECURITY],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker" }],
          security: [...SECURITY],
          deck: [...FILLER, ...FILLER],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    await settle();

    // The security Option's effect resolved without being "used", and it is not our turn.
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-102")).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(6000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
