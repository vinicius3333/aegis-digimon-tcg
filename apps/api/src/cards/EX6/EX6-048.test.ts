import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-048.js";
import "./EX6-051.js";
import "../index.js";

describe("EX6-048 Witchmon", () => {
  it("grants an opposing Digimon an End of Attack self-delete effect by trashing a hand card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      effectText: "[End of Attack] Delete this Digimon.",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
    }));
  it("inherits once-per-turn attack ending by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack" }],
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true } } },
        },
      ],
    }));
  it("publicly pays a hand card to grant the opposing Digimon its end-of-attack deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-048", as: "witch" },
            { card: "BT1-010", as: "cost" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-062", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witch").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("witch").topCard?.cardId === "EX6-048" && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    const opponentId = s.perm("opponent").permanentId;
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: opponentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === opponentId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === opponentId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
  });
  it("publicly ends an opponent attack by deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-009"],
          battleArea: [
            { card: "EX6-051", as: "host", under: ["EX6-048"] },
            { card: "BT1-010", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("cost").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("EX6-048 Witchmon — KB Q&A rulings", () => {
  function witchmonDefender(extra: SeatSpec = {}, withInherited = true): SeatSpec {
    return {
      security: ["BT1-009"],
      ...extra,
      battleArea: [
        { card: "EX6-051", as: "host", under: withInherited ? ["EX6-048"] : [] },
        ...(extra.battleArea ?? []),
      ],
    };
  }

  async function attackPlayer(board: BoardSpec, prefer: string[] = []) {
    const preferred: string[] = [];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    s.state.turnSeat = 1;
    await s.ready();
    for (const alias of prefer) preferred.push(s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("keeps the granted [End of Attack] deletion after the affected Digimon digivolves (Q3781)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-048", as: "witch" },
            { card: "BT1-010", as: "cost" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-014", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witch").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("witch").topCard?.cardId === "EX6-048" && s.state.pendingDecision === undefined);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponent").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard?.cardId === "BT1-014" && s.state.pendingDecision === undefined);
    const opponentId = s.perm("opponent").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: opponentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === opponentId));

    const trashIds = s.state.players[1]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(expect.arrayContaining([s.inst("opponent").instanceId, s.inst("evolution").instanceId]));
  });

  it("does not end the attack when no other Digimon can be deleted for its cost (Q3782)", async () => {
    const s = await attackPlayer({ 0: witchmonDefender(), 1: { battleArea: [{ card: "BT1-015", as: "attacker" }] } });
    await settle(() => s.state.players[0]!.security.length === 0);
    await advance(s.engine).finishAttack();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.permanentId)).toEqual([s.perm("host").permanentId]);
  });

  it("jumps straight to end of attack: no block timing and no security check (Q3783)", async () => {
    const s = await attackPlayer(
      {
        0: witchmonDefender({
          battleArea: [
            { card: "BT1-010", as: "cost" },
            { card: "BT1-031", as: "blocker" },
          ],
        }),
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
      },
      ["cost"],
    );
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
  });

  it("ends the attack of a Digimon that isn't affected by the opponent's effects (Q3784)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: witchmonDefender({ battleArea: [{ card: "BT1-010", as: "cost" }] }),
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("attacker").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { byOpponentEffectsOnly: true },
    );
    preferred.push(s.inst("cost").instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasRestriction(s.perm("attacker"), "beAffected")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  function counterBoard(withInherited: boolean) {
    return {
      0: witchmonDefender(
        {
          battleArea: [
            { card: "BT1-010", as: "cost" },
            { card: "BT1-033", as: "blueBase" },
          ],
          hand: [{ card: "BT14-026", as: "counterCard" }],
        },
        withInherited,
      ),
      1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
    };
  }

  it("skips counter timing once the attack is ended (Q3785)", async () => {
    const control = await attackPlayer(counterBoard(false), ["cost"]);
    await settle(() => control.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = control.events.find((event) => event.kind === "counterWindowOpened");
    expect(
      opened?.kind === "counterWindowOpened" ? opened.eligibleCounters.map((entry) => entry.instanceId) : [],
    ).toContain(control.inst("counterCard").instanceId);

    const s = await attackPlayer(counterBoard(true), ["cost"]);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("counterCard").instanceId]);
  });

  it("still activates the attacker's [End of Attack] effect after the attack is ended (Q3786)", async () => {
    const s = await attackPlayer(
      {
        0: witchmonDefender({ battleArea: [{ card: "BT1-010", as: "cost" }] }),
        1: { battleArea: [{ card: "BT9-025", as: "attacker" }], hand: ["BT1-009", "BT1-010"] },
      },
      ["cost"],
    );
    await settle(() => s.state.players[1]!.hand.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});
