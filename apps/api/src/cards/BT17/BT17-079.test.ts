import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-079.js";
import "./index.js";

describe("BT17-079 Takuya Kanbara", () => {
  it("plays itself from Security and gains memory when the opponent has a Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("gives the inherited host +2000 DP during its turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("grants Piercing only while the inherited host has at least 10000 DP", () => {
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
      while: { kind: "selfDpAtLeast", value: 10000 },
    });
  });

  it("naturally plays from Security and gains memory at main-phase start", async () => {
    const security = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-063", as: "attacker" }] },
        1: { security: [{ card: "BT17-079", as: "takuya" }] },
      },
      { autoSelectCards: true },
    );
    security.state.turnSeat = 0;
    await security.ready();
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-079"));
    expect(security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-079")).toBe(true);
    // Printed play cost is 3; [Security] plays it for free, so no payCost memory event fires.
    expect(
      security.events.some(
        (event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "payCost",
      ),
    ).toBe(false);
    expect(security.state.players[1]!.security.some((card) => card.cardId === "BT17-079")).toBe(false);

    const main = setupEngine({
      0: { battleArea: [{ card: "BT17-079", as: "mainTamer" }] },
      1: { battleArea: ["BT17-063"] },
    });
    main.state.memory = 0;
    main.state.turnSeat = 0;
    await main.ready();
    await advance(main.engine).runTurn(0);
    expect(
      main.events.some(
        (event) =>
          event.kind === "memoryChanged" &&
          "reason" in event &&
          event.reason === "gainMemory" &&
          event.from === 0 &&
          event.to === 1,
      ),
    ).toBe(true);
  });

  it("naturally grants the inherited host DP and Piercing only during its turn", async () => {
    const active = setupEngine({
      0: { battleArea: [{ card: "BT16-025", under: ["BT17-079"], as: "host" }] },
    });
    active.state.turnSeat = 0;
    await active.ready();

    expect(active.perm("host").currentDP).toBe(10000);
    expect(observe(active.engine).hasPierce(active.perm("host"))).toBe(true);

    const inactive = setupEngine({
      0: { battleArea: [{ card: "BT17-063", under: ["BT17-079"], as: "lowHost" }] },
    });
    inactive.state.turnSeat = 1;
    await inactive.ready();

    expect(inactive.perm("lowHost").currentDP).toBe(5000);
    expect(observe(inactive.engine).hasPierce(inactive.perm("lowHost"))).toBe(false);
  });

  it("gains no memory when the opponent has no Digimon in the battle area", async () => {
    const tamerOnly = setupEngine({
      0: { battleArea: [{ card: "BT17-079", as: "mainTamer" }] },
      1: { battleArea: [{ card: "BT17-080", as: "opponentTamer" }] },
    });
    tamerOnly.state.memory = 0;
    tamerOnly.state.turnSeat = 0;
    await tamerOnly.ready();
    await advance(tamerOnly.engine).runTurn(0);
    expect(
      tamerOnly.events.some(
        (event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "gainMemory",
      ),
    ).toBe(false);
  });

  it("does not count an opponent Digimon that sits in the breeding area", async () => {
    const breedingOnly = setupEngine({
      0: { battleArea: [{ card: "BT17-079", as: "mainTamer" }] },
      1: { breeding: { card: "BT1-010", as: "raised" } },
    });
    breedingOnly.state.memory = 0;
    breedingOnly.state.turnSeat = 0;
    await breedingOnly.ready();
    await advance(breedingOnly.engine).runTurn(0);
    expect(
      breedingOnly.events.some(
        (event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "gainMemory",
      ),
    ).toBe(false);
  });

  it("boosts only the host it sits under, not a peer stack carrying an inert digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-025", under: ["BT17-079"], as: "host" },
          { card: "BT16-025", under: ["BT1-009"], as: "nearMiss" },
          { card: "BT16-025", as: "bare" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(10_000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(s.perm("nearMiss").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("nearMiss"))).toBe(false);
    expect(s.perm("bare").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("bare"))).toBe(false);
  });

  it("checks security with the inherited Piercing after winning a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-025", under: ["BT17-079"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-009", suspended: true, as: "blocker" }], security: ["BT1-009", "BT1-011"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10_000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("withholds Piercing from a boosted host that still sits below 10000 DP", async () => {
    const belowThreshold = setupEngine({
      0: { battleArea: [{ card: "BT17-063", under: ["BT17-079"], as: "host" }] },
    });
    belowThreshold.state.turnSeat = 0;
    await belowThreshold.ready();

    expect(belowThreshold.perm("host").currentDP).toBe(7000);
    expect(observe(belowThreshold.engine).hasPierce(belowThreshold.perm("host"))).toBe(false);
  });
});
