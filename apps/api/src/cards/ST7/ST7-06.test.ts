import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST3/ST3-12.js";
import "./ST7-06.js";
import "./ST7-07.js";
import "./ST7-09.js";

const geoOnBoard = (s: EngineSetup) =>
  s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("geo").instanceId);

function attackPlayer(s: EngineSetup, attacker = "attacker") {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

describe("ST7-06 GeoGreymon", () => {
  it("deletes an opposing Digimon with 4000 DP or less on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST7-06", as: "geo" }] }, 1: { battleArea: ["ST7-04"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
  });

  it("plays itself from security at the end of the battle and resolves its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST7-07", as: "attacker" },
            { card: "BT1-009", as: "bystander" },
          ],
        },
        1: { security: [{ card: "ST7-06", as: "geo" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const memoryBefore = s.state.memory;
    attackPlayer(s);
    await settle(() => geoOnBoard(s) !== undefined && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).toBe(s.perm("attacker").permanentId);
    expect(s.state.memory).toBe(memoryBefore);
  });
});

describe("ST7-06 GeoGreymon — KB Q&A rulings", () => {
  it("is a normal Digimon, not a Security Digimon, once played by its [Security] effect (Q684)", async () => {
    const revealedDp: (number | undefined)[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-07", as: "attacker" }] },
        1: { battleArea: [{ card: "ST3-12", as: "tk" }], security: [{ card: "ST7-06", as: "geo" }] },
      },
      {
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind === "securityRevealed") revealedDp.push(event.securityCardDP);
        },
      },
    );
    attackPlayer(s);
    await settle(() => geoOnBoard(s) !== undefined);
    await s.ready();

    expect(revealedDp).toEqual([7000]);
    expect(geoOnBoard(s)!.currentDP).toBe(5000);
  });

  it("is played at the end of the battle even when it loses the battle (Q685)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-07", as: "attacker" }] },
        1: { security: [{ card: "ST7-06", as: "geo" }] },
      },
      { autoSelectCards: true },
    );
    attackPlayer(s);
    await settle(() => geoOnBoard(s) !== undefined);
    const checked = s.events.filter((event) => event.kind === "securityChecked");

    expect(checked).toHaveLength(1);
    expect(checked[0]).toMatchObject({ resolution: "battle", battle: { securityDigimonDeleted: true } });
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("attacker").permanentId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("geo").instanceId)).toBe(false);
  });

  it("is played and resolves [On Play] before the attacker's next security check (Q686)", async () => {
    const boardAtSecondReveal: { geoPlayed: boolean; bystanderAlive: boolean }[] = [];
    let reveals = 0;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST7-09", as: "attacker" },
            { card: "BT1-009", as: "bystander" },
          ],
        },
        1: { security: [{ card: "ST7-06", as: "geo" }, "BT1-010"] },
      },
      {
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind !== "securityRevealed") return;
          reveals += 1;
          if (reveals !== 2) return;
          boardAtSecondReveal.push({
            geoPlayed: geoOnBoard(s) !== undefined,
            bystanderAlive: s.state.players[0]!.battleArea.some(
              (p) => p.topCard?.instanceId === s.inst("bystander").instanceId,
            ),
          });
        },
      },
    );
    attackPlayer(s);
    await settle(() => reveals === 2 && s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(boardAtSecondReveal).toEqual([{ geoPlayed: true, bystanderAlive: false }]);
  });

  it("can delete the attacking Digimon with 4000 DP or less and <Jamming> with its [On Play] (Q687)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
        1: { security: [{ card: "ST7-06", as: "geo" }] },
      },
      { autoSelectCards: true },
    );
    attackPlayer(s);
    await settle(() => geoOnBoard(s) !== undefined && s.state.players[0]!.battleArea.length === 0);

    const battle = s.events.find((event) => event.kind === "securityChecked");
    expect(battle).toMatchObject({ battle: { attackerDeleted: false } });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(true);
  });
});
