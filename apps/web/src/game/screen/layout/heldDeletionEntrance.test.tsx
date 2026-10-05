// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { I18nProvider } from "../../../i18n";
import { FieldLayout, setFieldLayout } from "../../../design/fieldLayout";
import type { PermanentChrome } from "../types";
import { ViewerBattleRow } from "./ViewerBattleRow";
import { OpponentBattleRow } from "./OpponentBattleRow";

afterEach(cleanup);

function permanent(id: string, cardId: string) {
  const p = new Permanent();
  p.permanentId = id;
  p.topCard = new CardInstance();
  p.topCard.cardId = cardId;
  p.topCard.instanceId = `${id}-card`;
  return p;
}

function chrome(heldDeletionIds: ReadonlySet<string>): PermanentChrome {
  return {
    compact: false,
    width: 100,
    permanentRefs: { current: {} },
    effectSourcePermanentIds: new Set(),
    effectLinkedPermanentIds: new Set(),
    decisionPickedInstanceIds: new Set(),
    permanentBursts: new Map(),
    pendingPermanentIds: new Set(),
    fateBadges: new Map(),
    combatImpactIds: new Set(),
    dpPulses: new Map(),
    dpBadgeSuppressedIds: new Set(),
    freezePulses: new Map(),
    heldSuspendedIds: new Set(),
    heldDeletionIds,
    suspendDelayMs: () => 0,
  };
}

it.each(["viewer", "opponent"] as const)(
  "keeps restored deletion faces quiet on the %s row, including a hidden grouped member",
  (seat) => {
    setFieldLayout(FieldLayout.Organized);
    const target = permanent("target", "BT1-009");
    const first = permanent("first", "BT24-098");
    const second = permanent("second", "BT24-098");
    const newcomer = permanent("newcomer", "BT26-059");
    const established = [target, first, second];
    const view = (permanents: Permanent[], held: ReadonlySet<string> = new Set()) => {
      const common = {
        permanents,
        chrome: chrome(held),
        dropIntentAttrs: () => ({}),
        isDecisionCandidate: () => false,
        onPermanentClick: () => undefined,
        onPermanentInspect: () => {},
      };
      return (
        <I18nProvider>
          {seat === "viewer" ? (
            <ViewerBattleRow
              {...common}
              dragIsPlay={false}
              selectedAttackerPermanentId={null}
              isBasePermanent={() => false}
              draggable={() => false}
              baseDropIntentAttrs={() => ({})}
              onPermanentPointerDown={() => {}}
            />
          ) : (
            <OpponentBattleRow
              {...common}
              attackerPermanent={undefined}
              draggedAttackerPermanent={undefined}
              vortexMode={false}
            />
          )}
        </I18nProvider>
      );
    };
    const { container, rerender } = render(view(established));
    rerender(view([]));
    rerender(view([...established, newcomer], new Set(["target", "second"])));
    const entrance = (id: string) => container.querySelector(`[data-id="${id}"] .game-card-enter`)!;
    expect(entrance("target").classList.contains("game-card-enter--quiet")).toBe(true);
    expect(entrance("first").classList.contains("game-card-enter--quiet")).toBe(true);
    expect(entrance("newcomer").classList.contains("game-card-enter--quiet")).toBe(false);
    expect(container.querySelector('[data-id="first"]')?.getAttribute("data-field-member-ids")).toBe(
      '["first","second"]',
    );
  },
);
