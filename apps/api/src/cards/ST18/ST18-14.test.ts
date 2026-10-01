import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-14.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST18-14 Shoto Kazama", () => {
  it("declares memory setting, paid redirect to Digimon/player, and Security play", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [expect.objectContaining({ kind: "SetMemory" })],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              actions: [
                expect.objectContaining({
                  kind: "RedirectAttack",
                  includePlayer: true,
                  cost: expect.objectContaining({ kind: "suspend" }),
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });

  it("sets memory to three at the start of turn when memory is two", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-14", as: "shoto" }] } });
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ condition: { value: 2 }, value: 3 }],
    });
  });

  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST18-14", as: "shoto" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("pays by suspending itself to switch an attack on an opponent Digimon to the player", async () => {
    const preferInstanceIds = ["player"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-14", as: "shoto" },
            { card: "BT1-009", as: "attacker", dp: 7000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000, suspended: true }], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("target").permanentId,
    ]);
  });

  it("may decline redirection without suspending the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-14", as: "shoto" },
            { card: "BT1-009", as: "attacker", dp: 7000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000, suspended: true }], security: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST18-14")).toBe(true);
    expect(s.perm("shoto").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not offer a redirect when your Digimon attacks the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-14", as: "shoto" },
            { card: "BT1-009", as: "attacker", dp: 7000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "ST18-14")).toBe(false);
    expect(s.perm("shoto").isSuspended).toBe(false);
    expect(s.perm("target").topCard.cardId).toBe("BT1-010");
  });
});

function redirectBoard(preferInstanceIds: string[]) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "ST18-14", as: "shoto" },
          { card: "BT1-009", as: "attacker", dp: 7000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "declared", dp: 3000, suspended: true },
          { card: "BT1-010", as: "unsuspended", dp: 3000 },
          { card: "BT5-030", as: "cantBeAttacked", dp: 2000 },
        ],
        security: ["BT1-011"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
}

async function attackDeclaredAndRedirect(s: ReturnType<typeof redirectBoard>) {
  await s.ready();
  const attackerPermanentId = s.perm("attacker").permanentId;
  const unsuspendedId = s.perm("unsuspended").permanentId;
  const cantBeAttackedId = s.perm("cantBeAttacked").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId,
      target: { kind: "permanent", permanentId: unsuspendedId },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId,
      target: { kind: "permanent", permanentId: cantBeAttackedId },
    }).ok,
  ).toBe(false);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId,
      target: { kind: "permanent", permanentId: s.perm("declared").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking(), 3000);
  const redirectTargetDecision = s.decisions.find(
    ({ req }) => req.kind === "chooseTargets" && req.options?.candidateInstanceIds?.includes(unsuspendedId) === true,
  )?.req;
  expect(redirectTargetDecision?.options?.candidateInstanceIds).toEqual(
    expect.arrayContaining([unsuspendedId, cantBeAttackedId]),
  );
}

describe("ST18-14 Shoto Kazama — KB Q&A rulings", () => {
  it("switches the attack to an opponent's unsuspended Digimon (Q850)", async () => {
    const preferInstanceIds: string[] = [];
    const s = redirectBoard(preferInstanceIds);
    const unsuspendedId = s.perm("unsuspended").permanentId;
    preferInstanceIds.push(unsuspendedId);

    await attackDeclaredAndRedirect(s);

    expect(s.perm("shoto").isSuspended).toBe(true);
    const opponentIds = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(opponentIds).not.toContain(unsuspendedId);
    expect(opponentIds).toEqual(
      expect.arrayContaining([s.perm("declared").permanentId, s.perm("cantBeAttacked").permanentId]),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("switches the attack to an opponent's Digimon that can't be attacked (Q850)", async () => {
    const preferInstanceIds: string[] = [];
    const s = redirectBoard(preferInstanceIds);
    const cantBeAttackedId = s.perm("cantBeAttacked").permanentId;
    preferInstanceIds.push(cantBeAttackedId);

    await attackDeclaredAndRedirect(s);

    expect(s.perm("shoto").isSuspended).toBe(true);
    const opponentIds = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(opponentIds).not.toContain(cantBeAttackedId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT5-030")).toBe(true);
    expect(opponentIds).toEqual(
      expect.arrayContaining([s.perm("declared").permanentId, s.perm("unsuspended").permanentId]),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
