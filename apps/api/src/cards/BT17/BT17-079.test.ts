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
    await settle(() => security.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-079"));
    expect(security.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-079")).toBe(true);

    const main = setupEngine({ 0: { battleArea: [{ card: "BT17-079", as: "mainTamer" }] }, 1: { battleArea: ["BT17-063"] } });
    main.state.memory = 0;
    main.state.turnSeat = 0;
    await main.ready();
    await advance(main.engine).runTurn(0);
    expect(main.state.memory).toBe(1);
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
});
