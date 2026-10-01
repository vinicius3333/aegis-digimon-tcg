import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-080.js";
import "../BT4/BT4-070.js";
import "../ST2/ST2-11.js";
import "./BT12-057.js";

describe("BT12-057 Quartzmon", () => {
  it("digivolves for 9 from an off-color level 5 with Save text and rejects a plain near-match", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-041", as: "saveBase" }],
        hand: [{ card: "BT12-057", as: "quartz" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 9;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("saveBase").permanentId,
        instanceId: valid.inst("quartz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("saveBase").topCard.cardId === "BT12-057");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-041"]);
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "plainBase" }], hand: [{ card: "BT12-057", as: "quartz" }] },
    });
    invalid.state.memory = 9;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("quartz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(9);
    expect(invalid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-057"]);
  });

  it("suspends all other Digimon and Tamers on digivolution and gains memory per pair", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine" },
          { card: "BT1-085", as: "myTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs" },
          { card: "BT10-092", as: "theirTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("quartz"));
    expect(s.perm("quartz").isSuspended).toBe(false);
    expect(
      [s.perm("mine"), s.perm("myTamer"), s.perm("theirs"), s.perm("theirTamer")].every(
        ({ isSuspended }) => isSuspended,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("prevents every other Digimon and Tamer from unsuspending", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT10-092", as: "tamer", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId, s.perm("tamer").permanentId]);
    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("two Quartzmon copies prevent each other from unsuspending", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-057", as: "mine", suspended: true }] },
      1: { battleArea: [{ card: "BT12-057", as: "theirs", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId, s.perm("theirs").permanentId]);
    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("theirs").isSuspended).toBe(true);
  });

  it("allows a DNA result made from suspended materials to enter unsuspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT12-022", as: "blue", suspended: true },
          { card: "BT12-050", as: "green", suspended: true },
        ],
        hand: [{ card: "BT12-055", as: "dino" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-055"));
    expect(s.perm("dino").isSuspended).toBe(false);
    expect(s.perm("dino").stack.map(({ cardId }) => cardId)).toEqual(["BT12-050", "BT12-022"]);
  });

  it("suspends an opposing permanent and trashes security per 5 suspended permanents when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-057", as: "quartz" },
            { card: "BT1-009", suspended: true },
            { card: "BT1-010", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", suspended: true },
            { card: "BT10-092", suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("quartz"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT12-057 Quartzmon — KB Q&A rulings", () => {
  it("gains 1 memory for every 2 suspended Digimon and Tamers counted across both players (Q2183)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-080", as: "base" },
          { card: "BT1-009", as: "myDigimon", suspended: true },
          { card: "BT1-085", as: "myTamer", suspended: true },
        ],
        hand: [{ card: "BT12-057", as: "quartz" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "theirFirst", suspended: true },
          { card: "BT1-010", as: "theirSecond", suspended: true },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-057" && s.state.memory !== 0);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(["myDigimon", "myTamer", "theirFirst", "theirSecond"].every((alias) => s.perm(alias).isSuspended)).toBe(
      true,
    );
    expect(s.state.memory).toBe(2);
  });

  it("keeps every Quartzmon suspended in the unsuspend phase when 2 or more are in play (Q2184)", async () => {
    const ownPair = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "first", suspended: true },
          { card: "BT12-057", as: "second", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    await ownPair.ready();
    await advance(ownPair.engine).runTurn(0);
    expect(ownPair.perm("first").isSuspended).toBe(true);
    expect(ownPair.perm("second").isSuspended).toBe(true);

    const oneEach = setupEngine({
      0: {
        battleArea: [{ card: "BT12-057", as: "mine", suspended: true }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT12-057", as: "theirs", suspended: true }],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    await oneEach.ready();
    await advance(oneEach.engine).runTurn(0);
    expect(oneEach.perm("mine").isSuspended).toBe(true);

    const single = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "lone", suspended: true },
          { card: "BT1-009", as: "other", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    await single.ready();
    await advance(single.engine).runTurn(0);
    expect(single.perm("lone").isSuspended).toBe(false);
    expect(single.perm("other").isSuspended).toBe(true);
  });

  it("lets a DNA digivolution from 2 suspended Digimon enter unsuspended (Q2185)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT12-022", as: "blue", suspended: true },
          { card: "BT12-050", as: "green", suspended: true },
          { card: "BT1-009", as: "bystander", suspended: true },
        ],
        hand: [{ card: "BT12-055", as: "dino" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-055"));

    expect(s.perm("dino").isSuspended).toBe(false);
    expect(s.perm("dino").stack.map(({ cardId }) => cardId)).toEqual(["BT12-050", "BT12-022"]);
    expect(s.perm("bystander").isSuspended).toBe(true);
  });

  it("stops <Reboot> and 'Unsuspend this Digimon' effects from unsuspending other Digimon (Q2186)", async () => {
    function setupReboot(withQuartzmon: boolean) {
      return setupEngine({
        0: {
          battleArea: withQuartzmon ? [{ card: "BT12-057", as: "quartz" }] : [],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT4-070", as: "meteormon", suspended: true }],
          deck: ["BT1-009", "BT1-009"],
        },
      });
    }
    const reboot = setupReboot(true);
    await reboot.ready();
    await advance(reboot.engine).runTurn(0);
    expect(reboot.perm("meteormon").isSuspended).toBe(true);

    const rebootControl = setupReboot(false);
    await rebootControl.ready();
    await advance(rebootControl.engine).runTurn(0);
    expect(rebootControl.perm("meteormon").isSuspended).toBe(false);

    function setupAttacker(withQuartzmon: boolean) {
      return setupEngine({
        0: {
          battleArea: [{ card: "ST2-11", as: "metalGarurumon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: withQuartzmon ? [{ card: "BT12-057", as: "quartz", suspended: true }] : [],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      });
    }
    async function attackPlayer(s: ReturnType<typeof setupAttacker>) {
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("metalGarurumon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    }
    const locked = setupAttacker(true);
    await attackPlayer(locked);
    expect(locked.perm("metalGarurumon").isSuspended).toBe(true);

    const attackerControl = setupAttacker(false);
    await attackPlayer(attackerControl);
    expect(attackerControl.perm("metalGarurumon").isSuspended).toBe(false);
  });
});
