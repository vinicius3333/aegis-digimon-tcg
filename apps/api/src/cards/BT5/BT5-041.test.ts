import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-041.js";
import "../BT1/BT1-049.js";
import "../BT14/BT14-034.js";

describe("BT5-041 Taomon", () => {
  it("gives all opposing Security Digimon -1000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-043", as: "host", under: ["BT5-041"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-1000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("does not apply the inherited reduction on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-043", as: "host", under: ["BT5-041"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});

const TAOMON = "BT5-041";
const JIJIMON = "BT5-043";
const LABRAMON = "BT1-049";
const SUKAMON = "BT14-034";
const SECURITY_FILLER = "BT1-012";

async function attackSecurityThroughTaomon(securityDigimon: string) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: JIJIMON, as: "attacker", under: [TAOMON] }] },
      1: { security: [{ card: securityDigimon, as: "securityDigimon" }, SECURITY_FILLER] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  await s.engine.recomputeContinuousEffects();
  expect(observe(s.engine).securityDp(1)).toBe(-1000);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "securityChecked"));
  return s;
}

describe("BT5-041 Taomon — KB Q&A rulings", () => {
  it("a Security Digimon reduced to 0 DP still battles the checking Digimon instead of being deleted (Q1325)", async () => {
    const s = await attackSecurityThroughTaomon(LABRAMON);
    const labramonId = s.inst("securityDigimon").instanceId;

    expect(s.events.find((event) => event.kind === "securityRevealed")).toMatchObject({
      revealedCardId: LABRAMON,
      securityCardDP: 0,
    });
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      revealedCardId: LABRAMON,
      resolution: "battle",
      battle: { securityCardDP: 0, securityDigimonDeleted: true, attackerDeleted: false },
    });
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(labramonId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("a Security Digimon reduced to 0 DP still activates its [Security] effect (Q1326)", async () => {
    const s = await attackSecurityThroughTaomon(SUKAMON);
    const sukamonId = s.inst("securityDigimon").instanceId;
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sukamonId));

    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      revealedCardId: SUKAMON,
      resolution: "battle",
      battle: { securityCardDP: 0 },
    });
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([sukamonId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(sukamonId);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("a Security Digimon played by its [Security] effect no longer has its DP reduced in play (Q1327)", async () => {
    const s = await attackSecurityThroughTaomon(SUKAMON);
    const sukamonId = s.inst("securityDigimon").instanceId;
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sukamonId));
    await s.engine.recomputeContinuousEffects();

    const playedSukamon = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === sukamonId,
    );
    expect(s.events.find((event) => event.kind === "securityRevealed")).toMatchObject({ securityCardDP: 0 });
    expect(observe(s.engine).securityDp(1)).toBe(-1000);
    expect(playedSukamon?.currentDP).toBe(1000);
    assertNoLoudGap(s);
  });
});
