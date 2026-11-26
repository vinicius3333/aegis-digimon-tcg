import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-10";
const myotismon = "BT2-075";
const venomMyotismon = "BT2-079";
const purpleLevel4 = "BT4-080";
const purpleHost = "BT3-083";
const redLevel3 = "BT1-009";

function mainBoard(options: { accept: boolean }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: purpleHost, as: "host" }],
        hand: [
          { card: cardId, as: "vampire" },
          { card: myotismon, as: "handMyotismon" },
        ],
        trash: [
          { card: myotismon, as: "myotismon" },
          { card: venomMyotismon, as: "venom" },
          { card: purpleLevel4, as: "bakemon" },
        ],
      },
    },
    options.accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
  );
  s.state.memory = 8;
  return s;
}

function trashCandidates(s: ReturnType<typeof setupEngine>) {
  const selection = s.decisions.find((decision) => decision.req.kind === "selectCards");
  return [...(selection?.req.options?.candidateInstanceIds ?? [])].sort();
}

function securityBoard(trash: { card: string; as: string }[]) {
  const s = setupEngine(
    {
      0: { security: [{ card: cardId, as: "vampire" }], trash },
      1: { battleArea: [{ card: redLevel3, as: "attacker" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  return s;
}

async function attackSecurity(s: ReturnType<typeof setupEngine>) {
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

describe("BD03-10 Immortal Vampire", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Immortal Vampire",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 8,
      rarity: "R",
      effectText:
        "[Main] You may play 1 Digimon card with [Myotismon] in its name from your trash without paying the cost.",
      securityEffectText:
        "[Security] You may play 1 level 4 or lower purple Digimon card from your trash without paying the cost.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays a Digimon with Myotismon in its name from the trash without paying its cost", async () => {
    const s = mainBoard({ accept: true });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vampire").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(trashCandidates(s)).toEqual([s.inst("myotismon").instanceId, s.inst("venom").instanceId].sort());
    expect(s.state.memory).toBe(0);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId !== purpleHost)!;
    expect([myotismon, venomMyotismon]).toContain(played.topCard.cardId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("handMyotismon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(cardId);
  });

  it("may decline the play from the trash", async () => {
    const s = mainBoard({ accept: false });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vampire").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(s.state.memory).toBe(0);
  });

  it("plays a level 4 or lower purple Digimon from the trash as a security effect", async () => {
    const s = securityBoard([
      { card: purpleLevel4, as: "bakemon" },
      { card: myotismon, as: "tooHigh" },
      { card: redLevel3, as: "wrongColor" },
    ]);
    await s.ready();
    const memoryBeforeAttack = s.state.memory;

    await attackSecurity(s);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("bakemon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("vampire").instanceId, s.inst("tooHigh").instanceId, s.inst("wrongColor").instanceId].sort(),
    );
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });

  it("plays nothing from the trash with only a level 5 purple or a non-purple Digimon there", async () => {
    const s = securityBoard([
      { card: myotismon, as: "tooHigh" },
      { card: redLevel3, as: "wrongColor" },
    ]);
    await s.ready();

    await attackSecurity(s);
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
