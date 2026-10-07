import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import type { SequencedServerEvent } from "@aegis/shared";
import { openCombatWindow } from "./combatWindowModel";
import { combatWindowsFor } from "./screen/model/combatWindows";
import { expect, it } from "vitest";
import { buildInstanceZoneIndex } from "./decisionModel";
import { prePlayPromptFor } from "./screen/model/prePlayPrompt";
it("#4989 groups both players' link cards separately from battle-area cards and digivolution cards", () => {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    const p = new PlayerState();
    p.seat = seat;
    const perm = new Permanent();
    perm.permanentId = `perm${seat}`;
    perm.topCard = Object.assign(new CardInstance(), { instanceId: `top${seat}`, cardId: "BT26-010" });
    perm.linked.push(Object.assign(new CardInstance(), { instanceId: `link${seat}`, cardId: "BT26-019" }));
    perm.stack.push(Object.assign(new CardInstance(), { instanceId: `source${seat}`, cardId: "BT26-007" }));
    p.battleArea.push(perm);
    state.players.push(p);
  }
  const zones = buildInstanceZoneIndex(state, 0);
  expect(zones.get("top0")).toBe("battle");
  expect(zones.get("source0")).toBe("digivolutionCards");
  expect(zones.get("link0")).toBe("linkedCards");
  expect(zones.get("link1")).toBe("opponentLinkedCards");
});
it.each([0, 1] as const)("keeps the original top card in digivolution cards after evolving seat %s", (ownerSeat) => {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players.push(player);
  }
  const permanent = new Permanent();
  permanent.permanentId = "original-roleplaymon";
  permanent.topCard = Object.assign(new CardInstance(), { instanceId: "dantemon", cardId: "BT26-086" });
  permanent.stack.push(Object.assign(new CardInstance(), { instanceId: "original-roleplaymon", cardId: "BT26-010" }));
  state.players[ownerSeat]!.battleArea.push(permanent);
  expect(buildInstanceZoneIndex(state, 0).get("original-roleplaymon")).toBe(
    ownerSeat === 0 ? "digivolutionCards" : "opponentDigivolutionCards",
  );
  expect(buildInstanceZoneIndex(state, 0, { permanentTargets: true }).get("original-roleplaymon")).toBe(
    ownerSeat === 0 ? "battle" : "opponentBattle",
  );
});

it("#4967 playing Omnimon offers Assembly even when a DNA route is also available", () => {
  const viewer = new PlayerState();
  for (const [i, id] of ["ST20-11", "ST21-11", "ST20-10", "ST21-10"].entries())
    viewer.trash.push(Object.assign(new CardInstance(), { instanceId: `mat${i}`, cardId: id }));
  const entry = {
    instanceId: "omni",
    cardId: "EX13-016",
    activatableEffectsJson: "",
    playableFromHand: true,
    projectedPlayCost: 15,
    digivolveTargetPermanentIds: [],
    linkTargetPermanentIds: [],
    dnaDigivolveRoutes: [{ materialPermanentIds: ["wargrey", "metalgaruru"], projectedCost: 0 }],
  };
  expect(prePlayPromptFor({ entry, viewer, confirmDrop: false, actionConfirmationsEnabled: false })?.kind).toBe(
    "assembly",
  );
  expect(
    prePlayPromptFor({ entry, viewer, confirmDrop: false, actionConfirmationsEnabled: false, preferDna: true }),
  ).toEqual({ kind: "dna", instanceId: "omni", cardId: "EX13-016", routes: entry.dnaDigivolveRoutes });
});

it("#4985 reopens the second Alliance when both prompts arrive without an intermediate render", () => {
  const state = new GameState();
  const player = new PlayerState();
  player.seat = 0;
  const attacker = new Permanent();
  attacker.permanentId = "jesmon";
  attacker.controllerSeat = 0;
  player.battleArea.push(attacker);
  state.players.push(player);
  const answered = { current: undefined as string | undefined };
  const rejection = { current: undefined as number | undefined };
  const first = {
    kind: "alliancePrompt",
    permanentId: "jesmon",
    eligibleAllyIds: ["first", "second"],
    seq: 1,
    batch: "attack",
    stateVersion: 10,
  } as const;
  const events: SequencedServerEvent[] = [{ ...first, eligibleAllyIds: [...first.eligibleAllyIds] }];
  const render = () =>
    combatWindowsFor({
      events,
      state,
      viewerSeat: 0,
      isMyTurn: true,
      mirroredWindow: null,
      openCombatWindow: openCombatWindow(events, state, 0),
      answeredCombatWindowKeyRef: answered,
      rolledBackRejectionSeqRef: rejection,
    });
  const initial = render();
  expect(initial.allianceWindow).not.toBeNull();
  initial.markCombatWindowAnswered();
  expect(render().allianceWindow).toBeNull();
  events.push(
    { kind: "allianceResolved", permanentId: "jesmon", seq: 2, batch: "attack", stateVersion: 11 },
    { ...first, eligibleAllyIds: ["second"], seq: 3, stateVersion: 12 },
  );
  expect(render().allianceWindow?.eligibleAllyIds).toEqual(["second"]);
});
