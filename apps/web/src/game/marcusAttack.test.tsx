// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardInstance, CardKind, GameState, Permanent, Phase, PlayerState, getCardDefinition } from "@aegis/shared";
import { canAttackPlayerWith, canAttackWith } from "./boardModel";
import { ownPermanentTapDestination } from "./ownPermanentStack";
import { useBoardSelection } from "./screen/hooks/useBoardSelection";
import { actionGuards } from "./screen/model/actionGuards";
import { canDragCard, dragIntentAt } from "./screen/model/screenDragIntents";
import { DragKind } from "./screen/enums";
import type { DragState } from "./screen/types";

// Frontend contract fixtures: attack legality is projected by the server, not
// inferred from the printed Tamer kind or the displayed DP. Public engine
// transformation/attack controls live in BT13-008.attack.test.ts.
describe.each([0, 1] as const)("Discord 1557489818450002040 — frontend seat %s", (seat) => {
  it.each([true, false])(
    "honors Marcus's projected attack availability %s in menus, drag and selection",
    (available) => {
      const state = new GameState();
      state.phase = Phase.Main;
      state.turnSeat = seat;
      for (const index of [0, 1] as const) {
        const player = new PlayerState();
        player.seat = index;
        state.players.push(player);
      }
      const marcus = new Permanent();
      marcus.permanentId = "marcus";
      marcus.controllerSeat = seat;
      marcus.currentDP = 3000;
      marcus.topCard = new CardInstance();
      marcus.topCard.cardId = "BT12-092";
      marcus.topCard.instanceId = "marcus-card";
      marcus.canAttackPlayer = available;
      const viewer = state.players[seat]!;
      viewer.battleArea.push(marcus);
      expect(getCardDefinition(marcus.topCard.cardId)!.kinds).toContain(CardKind.Tamer);
      expect(canAttackWith(marcus)).toBe(available);
      expect(canAttackPlayerWith(marcus, false)).toBe(available);
      expect(
        ownPermanentTapDestination({
          canAttack: canAttackWith(marcus),
          canVortex: false,
          canPromote: false,
          hasEffects: false,
        }),
      ).toBe(available ? "menu" : "stack");
      const guards = actionGuards({
        state,
        viewer,
        viewerSeat: seat,
        decisionOpen: false,
        presenting: false,
        phasePresentationPending: false,
      });
      expect(guards.mainActionBlocked).toBe(false);
      const drag: DragState = {
        kind: DragKind.Attack,
        permanentId: marcus.permanentId,
        cardId: marcus.topCard.cardId,
        x: 0,
        y: 0,
        ox: 0,
        oy: 0,
        started: true,
      };
      expect(canDragCard({ drag, you: viewer, handEntries: [] })).toBe(available);
      expect(dragIntentAt({ hit: { target: "opp-security" }, drag, you: viewer, handEntries: [] })).toBe(
        available ? "attack" : null,
      );
      const { result, rerender, unmount } = renderHook(() => useBoardSelection({ state, viewerSeat: seat }));
      act(() => result.current.setSelPerm(marcus.permanentId));
      expect(result.current.selPerm).toBe(available ? marcus.permanentId : null);
      // The same synchronized object can lose eligibility after suspension or expiry.
      marcus.canAttackPlayer = false;
      rerender();
      expect(result.current.selPerm).toBeNull();
      unmount();
    },
  );
});
