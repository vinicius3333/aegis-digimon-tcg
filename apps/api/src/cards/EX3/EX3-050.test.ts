import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-050.js";

describe("EX3-050 Cyberdramon", () => {
  it("has the official metadata and digivolves from a black level 4 for 3", async () => {
    expect(getCardDefinition("EX3-050")).toMatchObject({
      cardId: "EX3-050",
      nameEn: "Cyberdramon",
      colors: ["Black"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      rarity: "C",
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [{ card: "EX3-050", as: "cyberdramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cyberdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-050");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX3-050");
  });

  it("gives its carrier +2000 DP only while an allied Tamer is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-050"], as: "cyborgHost" },
          { card: "EX3-065", as: "hina" },
        ],
      },
    });
    await s.ready();
    const host = s.perm("cyborgHost");
    const baseDP = host.baseDP;

    expect(host.currentDP).toBe(baseDP);

    await advance(s.engine).verb.suspend([s.perm("hina").permanentId]);
    await settle(() => host.currentDP === baseDP + 2000);
    expect(host.currentDP).toBe(baseDP + 2000);

    await advance(s.engine).verb.unsuspend([s.perm("hina").permanentId]);
    await settle(() => host.currentDP === baseDP);
    expect(host.currentDP).toBe(baseDP);
  });

  it("applies during both players' turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-050"], as: "host" },
          { card: "EX3-065", as: "hina", suspended: true },
        ],
      },
    });
    await s.ready();
    const host = s.perm("host");

    expect(host.currentDP).toBe(host.baseDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(host.currentDP).toBe(host.baseDP + 2000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(host.currentDP).toBe(host.baseDP + 2000);
  });

  it("does not count an opponent's suspended Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-054", under: ["EX3-050"], as: "host" }] },
      1: { battleArea: [{ card: "EX3-065", as: "opponentHina", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not count an allied suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-050"], as: "host" },
          { card: "EX3-046", as: "suspendedDigimon", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not multiply one inherited effect for multiple suspended Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-050"], as: "host" },
          { card: "EX3-065", as: "firstHina", suspended: true },
          { card: "EX3-065", as: "secondHina", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("stacks two independent inherited Cyberdramon sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-050", "EX3-050"], as: "host" },
          { card: "EX3-065", as: "hina", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 4000);
  });

  it("does nothing while Cyberdramon is the top card instead of a digivolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-050", as: "cyberdramon" },
          { card: "EX3-065", as: "hina", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("cyberdramon").currentDP).toBe(7000);
  });
});
