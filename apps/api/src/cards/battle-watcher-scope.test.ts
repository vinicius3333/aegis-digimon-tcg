import { describe, expect, it } from "vitest";
import { advance } from "../engine/testkit/advance.js";
import { setupEngine } from "../engine/testkit/harness.js";
import { observe } from "../engine/testkit/observe.js";
import "./BT1/BT1-077.js";
import "./BT2/BT2-051.js";
import "./BT3/BT3-050.js";
import "./BT3/BT3-111.js";
import "./BT5/BT5-062.js";
import "./BT6/BT6-052.js";
import "./EX1/EX1-037.js";
import "./EX1/EX1-040.js";
import "./P/P-002.js";
import "./ST4/ST4-11.js";

describe("self-scoped battle deletion watchers", () => {
  it("only grants memory from the inherited source under the Digimon that won", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", as: "okuwamonHost", under: ["BT1-077"] },
          { card: "BT3-052", as: "stingmonHost", under: ["BT3-050"] },
          { card: "BT1-081", as: "megaKabuterimonHost", under: ["EX1-040"] },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("okuwamonHost").permanentId,
    });
    expect(s.state.memory).toBe(1);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("stingmonHost").permanentId,
    });
    expect(s.state.memory).toBe(2);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("megaKabuterimonHost").permanentId,
    });
    expect(s.state.memory).toBe(3);
  });

  it("only unsuspends the Digimon that actually won", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-111", as: "imperialdramon", suspended: true },
          { card: "BT6-052", as: "entmon", suspended: true },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("entmon").permanentId,
    });
    expect(s.perm("entmon").isSuspended).toBe(false);
    expect(s.perm("imperialdramon").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("imperialdramon").permanentId,
    });
    expect(s.perm("imperialdramon").isSuspended).toBe(false);
  });

  it("does not draw or trash security for a different Digimon's battle win", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "biyomonHost", under: ["P-002"] },
          { card: "ST4-13", as: "megaKabuterimonHost", under: ["ST4-11"] },
          { card: "BT2-047", as: "otherWinner" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-011", as: "security" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("biyomonHost").permanentId,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("megaKabuterimonHost").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("only lets Mekanorimon unsuspend from its own opponent-turn battle win", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-062", as: "mekanorimon", suspended: true },
          { card: "BT2-047", as: "otherWinner" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.perm("mekanorimon").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("mekanorimon").permanentId,
    });
    expect(s.perm("mekanorimon").isSuspended).toBe(false);
  });

  it("only applies RustTyrannomon and Kuwagamon target effects for their own winner", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-051", as: "rustTyrannomon" },
            { card: "EX1-040", as: "kuwagamonHost", under: ["EX1-037"] },
            { card: "BT2-047", as: "otherWinner" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "targetToSuspend" },
            { card: "BT1-011", as: "targetToRestrict", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.perm("targetToSuspend").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("targetToRestrict"), "unsuspend")).toBe(false);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("rustTyrannomon").permanentId,
    });
    expect(s.perm("targetToSuspend").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("targetToRestrict"), "unsuspend")).toBe(false);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("kuwagamonHost").permanentId,
    });
    expect(
      [s.perm("targetToSuspend"), s.perm("targetToRestrict")].some((permanent) =>
        observe(s.engine).isRestricted(permanent, "unsuspend"),
      ),
    ).toBe(true);
  });
});
