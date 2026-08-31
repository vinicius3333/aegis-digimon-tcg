import { getCardDefinition, Phase, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-012.js";
import "./EX3-018.js";
import "./EX3-065.js";

describe("EX3-012 Volcanicdramon", () => {
  it("has its official identity and both printed evolution colors", () => {
    expect(getCardDefinition("EX3-012")).toMatchObject({
      cardId: "EX3-012",
      nameEn: "Volcanicdramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Earth Dragon"],
      rarity: "SR",
      imageId: "EX3-012",
    });
  });

  it("deletes every opposing Digimon tied for the lowest DP and does not restrict play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-012", as: "volcanicdramon" }] },
      1: {
        hand: [{ card: "BT1-009", as: "smallPlay" }],
        battleArea: [
          { card: "BT1-009", as: "lowestA", dp: 3000 },
          { card: "BT1-013", as: "lowestB", dp: 3000 },
          { card: "BT1-019", as: "higher", dp: 6000 },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const deletedIds = [s.perm("lowestA").topCard.instanceId, s.perm("lowestB").topCard.instanceId];
    const survivorId = s.perm("higher").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => deletedIds.every((id) => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === id)));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("smallPlay").instanceId })).toEqual({
      ok: true,
    });
  });

  it("uses the actual deletion receipt after Evade to arm the play prohibition", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-012", as: "volcanicdramon" }] },
      1: {
        battleArea: [{ card: "EX3-018", as: "evader" }],
        hand: [{ card: "BT1-013", as: "atLimit" }],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const evaderId = s.perm("evader").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondEvade",
        permanentId: evaderId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.some(
          ({ permanentId, isSuspended }) => permanentId === evaderId && isSuspended,
        ) &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-012") &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-012"),
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === evaderId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("atLimit").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
  });

  it("enforces the exact 5000-DP boundary while the opponent-turn restriction is active", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-012", as: "volcanicdramon" }],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
      1: {
        hand: [
          { card: "BT1-013", as: "atLimit" },
          { card: "BT1-071", as: "aboveLimit" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-012"),
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("atLimit").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("aboveLimit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-071"));
  });

  it("trashes one security before its normal check when attacking with a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-012", as: "attacker" },
          { card: "EX3-065", as: "hina" },
        ],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();
    const trashedByEffectId = s.state.players[1]!.security[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    const effectTrashIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        event.from === Zone.Security &&
        event.to === Zone.Trash &&
        event.instanceIds.includes(trashedByEffectId),
    );
    const normalCheckIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(effectTrashIndex).toBeGreaterThanOrEqual(0);
    expect(normalCheckIndex).toBeGreaterThan(effectTrashIndex);
  });

  it("does not trash extra security when attacking without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-012", as: "attacker" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("Earth Dragon trait: Hina reactivates its On Play effect after digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-011", as: "base" },
            { card: "EX3-065", as: "hina" },
          ],
          hand: [{ card: "EX3-012", as: "volcanicdramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000 },
            { card: "BT1-013", dp: 3000 },
            { card: "BT1-019", as: "survivor", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const survivorId = s.perm("survivor").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);
    expect(s.perm("hina").isSuspended).toBe(true);
  });
});
