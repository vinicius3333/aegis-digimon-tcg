import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-012.js";
import "./P-011.js";
import "./P-024.js";
import "../BT12/BT12-059.js";

describe("P-012 Tai Kamiya (V-Tamer)", () => {
  it("suspends itself to draw when a Veedramon-family Digimon is in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011" }, { card: "P-012", as: "tai" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "P-012/main",
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("tai").isSuspended && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
    );

    expect(s.perm("tai").isSuspended).toBe(true);
  });

  it("may give any own Digimon +1000 DP, not only the Veedramon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011" }, { card: "BT1-010", as: "recipient" }, { card: "P-012", as: "tai" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("recipient").permanentId);
    const baseDP = s.perm("recipient").baseDP;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "P-012/main",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").currentDP === baseDP + 1000);

    expect(s.perm("recipient").currentDP).toBe(baseDP + 1000);
  });

  it("does not activate when the only Veedramon is in the breeding area (Q4124)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-011" },
        battleArea: [{ card: "P-012", as: "tai" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "P-012/main",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("tai").isSuspended).toBe(false);
  });

  it("may decline without suspending itself or resolving either branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011" }, { card: "P-012", as: "tai" }],
          deck: [{ card: "BT1-009", as: "deck-top" }],
        },
      },
      { autoChooseOption: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "P-012/main",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("tai").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays itself for free from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-012", as: "tai" }] },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const taiId = s.inst("tai").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId)).toBe(true);
  });
});

describe("P-012 Tai Kamiya (V-Tamer) — KB Q&A rulings", () => {
  function activate(s: ReturnType<typeof setupEngine>, alias: string) {
    return s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm(alias).topCard.instanceId,
      effectKey: "P-012/main",
    });
  }

  it("is a Tamer with [Tai Kamiya] in its name, so BT12-059's reveal may add it to hand (Q2189)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: [
            { card: "P-012", as: "tai" },
            { card: "BT1-009", as: "other1" },
            { card: "BT1-009", as: "other2" },
            { card: "BT1-009", as: "other3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, declineDigiXros: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length > 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tai").instanceId);
  });

  it("can't interrupt an attack; its [Main] effect is only usable while the main phase is idle (Q4123)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-011", as: "veedramon" }, { card: "P-012", as: "tai" }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    expect(activate(s, "tai")).toMatchObject({ ok: false });
    expect(s.perm("tai").isSuspended).toBe(false);
  });

  it("lets two copies each suspend and activate off one Veedramon (Q4125)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011" }, { card: "P-012", as: "firstTai" }, { card: "P-012", as: "secondTai" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    await s.ready();

    expect(activate(s, "firstTai")).toEqual({ ok: true });
    await settle(() => s.perm("firstTai").isSuspended && s.state.pendingDecision === undefined);
    expect(activate(s, "secondTai")).toEqual({ ok: true });
    await settle(() => s.perm("secondTai").isSuspended && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("may give +1000 DP to a Digimon without [Veedramon] in its name (Q4126)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-011", as: "veedramon" }, { card: "BT1-010", as: "agumon" }, { card: "P-012", as: "tai" }] } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("agumon").permanentId);
    await s.ready();

    expect(activate(s, "tai")).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("tai").isSuspended);

    expect(s.perm("agumon").currentDP).toBe(s.perm("agumon").baseDP + 1000);
    expect(s.perm("veedramon").currentDP).toBe(s.perm("veedramon").baseDP);
  });

  it("doesn't count as an exact [Tai Kamiya] for P-024 Tai's Growing Up! (Q4133)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-012", as: "tai" }, { card: "BT1-010", as: "agumon" }],
          hand: [{ card: "P-024", as: "option" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length > 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(s.perm("agumon").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
