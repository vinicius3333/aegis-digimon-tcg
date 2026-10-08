import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("GitHub #5316/#5317 Shoutmon printed-rules arena controls", () => {
  it.each([false, true])(
    "#5316: actual turn loop enforces the Xros Heart Rush condition (control=%s)",
    async (control) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layDevScenario(control ? "arena-github-5316-shoutmon-rush-control" : "arena-github-5316-shoutmon-rush", s.state, [
        RED_DECK,
        BLUE_DECK,
      ]);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: "dev-shoutmon-host",
            digiXros: { materialInstanceIds: ["dev-shoutmon-omni", "dev-shoutmon-other"] },
          }),
        ).toEqual({ ok: true });
        const cardId = control ? "BT21-027" : "BT15-012";
        await settle(
          () =>
            s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === cardId) &&
            s.state.pendingDecision === undefined,
        );
        const host = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === "dev-shoutmon-host")!;
        expect(host.stack.map((c) => c.instanceId)).toEqual(["dev-shoutmon-other", "dev-shoutmon-omni"]);
        expect(observe(s.engine).hasKeyword(host, "Rush")).toBe(control);
        expect(s.state.memory).toBe(control ? 4 : 7);
        const securityBefore = s.state.players[1]!.security.length;
        const result = s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: host.permanentId,
          target: { kind: "player" },
        });
        expect(result).toMatchObject({ ok: control });
        if (control) {
          await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        }
        expect(s.events.some((e) => e.kind === "securityChecked")).toBe(control);
        expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(control);
        expect(s.state.players[1]!.security).toHaveLength(control ? securityBefore - 2 : securityBefore);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );

  it.each([false, true])(
    "#5317: actual start-turn deletion saves printed names but excludes DigiXros-only aliases (printed=%s)",
    async (printed) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layDevScenario(
        printed
          ? "arena-github-5317-shoutmon-material-save-printed"
          : "arena-github-5317-shoutmon-material-save-evolved",
        s.state,
        [RED_DECK, BLUE_DECK],
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(4);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT15-012")).toBe(false);
        const tamer = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT10-087")!;
        expect(tamer.stack.map((c) => c.cardId).sort()).toEqual(printed ? ["BT10-008", "BT10-049"] : []);
        expect(s.state.players[0]!.trash.map((c) => c.cardId).sort()).toEqual(
          printed ? ["BT15-012"] : ["BT15-012", "BT19-051", "BT21-021"],
        );
        expect(s.decisions.some(({ req }) => req.promptText?.includes("Material Save"))).toBe(printed);
        expect(
          s.events.filter(
            (e) => e.kind === "effectTriggered" && (e.sourceCardId === "BT21-021" || e.sourceCardId === "BT19-051"),
          ),
        ).toHaveLength(0);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
