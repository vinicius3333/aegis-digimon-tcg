import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle, type SeatSpec } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("Hisyaryumon (BT27) De-Digivolve, attack deletion, security evolution and inherited redirect", () => {
  it("only de-digivolves when played outside an attack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT27-013", as: "hisyaryumon" }] },
        1: {
          battleArea: [
            { card: "BT10-064", as: "stacked", under: ["BT10-062"] },
            { card: "BT1-009", as: "small" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hisyaryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("stacked").topCard.cardId === "BT10-062" && !s.state.pendingDecision);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("de-digivolves, then deletes a Digimon with DP up to its own when digivolving during an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-009", as: "attacker", under: ["BT20-010"] }],
          hand: [{ card: "BT27-013", as: "hisyaryumon" }],
        },
        1: {
          battleArea: [
            { card: "BT10-064", as: "stacked", under: ["BT10-062"] },
            { card: "BT8-017", as: "huge" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("stacked").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT10-062"));
    expect(s.perm("attacker").topCard.cardId).toBe("BT27-013");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT8-017"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT10-064", "BT10-062"]),
    );
  });

  it("digivolves into a [Chronicle] Digimon from the trash when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-013", as: "attacker", under: ["BT27-008", "BT27-009"] }],
          trash: [{ card: "BT27-015", as: "ouryumon" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT27-015" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not digivolve when its own security is removed on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-013", as: "hisyaryumon" }],
          trash: [{ card: "BT27-015", as: "ouryumon" }],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("hisyaryumon").topCard.cardId).toBe("BT27-013");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT27-015");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited effect redirects an opponent's attack to a [Chronicle] Digimon once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT27-013"] },
            { card: "BT20-048", as: "chronicle" },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "attacker" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT20-048");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("official rulings", () => {
  async function opponentAttacksPlayer(own: SeatSpec, attacker: string) {
    const s = setupEngine(
      {
        0: { ...own, security: ["BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: attacker, as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && !s.state.pendingDecision);
    return { s, loop };
  }

  it("counts an opponent's attack as during an attack when digivolving", async () => {
    const { s, loop } = await opponentAttacksPlayer(
      {
        battleArea: [
          { card: "P-204", as: "option" },
          { card: "BT27-009", as: "ginryumon" },
        ],
        hand: [{ card: "BT27-013", as: "hisyaryumon" }],
      },
      "BT1-009",
    );
    expect(s.perm("ginryumon").topCard.instanceId).toBe(s.inst("hisyaryumon").instanceId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("changes the attack target of an attacker that isn't affected by its effects", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT27-013"] },
            { card: "BT20-048", as: "chronicle" },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT15-047", as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT20-048");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("activates a checked Security effect before its security removal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-013", as: "attacker", under: ["BT27-008", "BT27-009"] }],
          trash: [{ card: "BT27-015", as: "ouryumon" }],
        },
        1: { security: ["BT27-098", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.perm("attacker").topCard.cardId).toBe("BT27-015");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT27-098");
    expect(
      s.events.flatMap((event) =>
        event.kind === "effectTriggered" && ["BT27-098", "BT27-013"].includes(event.sourceCardId)
          ? [event.sourceCardId]
          : [],
      ),
    ).toEqual(["BT27-098", "BT27-013"]);
  });
});
