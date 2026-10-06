// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { Permanent } from "@aegis/shared";
import { OrganizedBattleRow } from "./OrganizedBattleRow";
import { I18nProvider } from "../../../i18n";
import { BattleLanes, setBattleLanes } from "../../../design/battleLanes";
import { SINGLE_LANE_PHONE_QUERY } from "../queries";
import { useFieldCardWidth } from "./fieldCardWidth";

function permanent(id: string) {
  const card = new Permanent();
  card.permanentId = id;
  return card;
}

function mockViewport({ phone }: { phone: boolean }) {
  const listeners = new Set<() => void>();
  const query = { matches: phone };
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      get matches() {
        return media === SINGLE_LANE_PHONE_QUERY && query.matches;
      },
      media,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return (next: boolean) => {
    query.matches = next;
    for (const listener of listeners) listener();
  };
}

function view(support: Permanent[], supportFirst = false) {
  return (
    <I18nProvider>
      <OrganizedBattleRow
        arrangement={{
          digimon: [permanent("digimon")],
          support: support.map((member) => ({ key: member.permanentId, members: [member] })),
        }}
        layoutWidth={100}
        supportFirst={supportFirst}
        digimonLabel="Digimon"
        supportLabel="Support"
        emptyLabel={null}
        rowProps={{ style: { "--field-reserve-support": "1", "--field-support-scale": "1" } as React.CSSProperties }}
        isSuspended={(member) => member.isSuspended}
        renderCard={(card) => <div key={card.fieldKey} data-field-key={card.fieldKey} style={{ width: card.width }} />}
      />
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  setBattleLanes(BattleLanes.Two);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("organized battle lanes", () => {
  it("puts the groups after the Digimon in one lane when one lane is chosen", () => {
    mockViewport({ phone: false });
    setBattleLanes(BattleLanes.One);
    const { container } = render(view([permanent("tamer")]));
    expect(container.querySelector("[data-field-layout]")!.getAttribute("data-lanes")).toBe("merged");
    expect(container.querySelector(".game-battle-lane--support")).toBeNull();
    const keys = [...container.querySelectorAll(".game-battle-lane--digimon [data-field-key]")].map((card) =>
      card.getAttribute("data-field-key"),
    );
    expect(keys).toEqual(["digimon", "tamer"]);
  });

  it("draws one lane on a phone and restores the saved two lanes on a wider screen", () => {
    const resize = mockViewport({ phone: true });
    const { container } = render(view([permanent("tamer")]));
    const lanes = () => container.querySelector("[data-field-layout]")!.getAttribute("data-lanes");
    expect(lanes()).toBe("merged");
    expect(localStorage.getItem("aegis.battle-lanes")).toBe("two");

    act(() => resize(false));
    expect(lanes()).toBe("stacked");
  });

  it("grows a single lane's cards while the pieces beside the rows keep the two-lane size", () => {
    mockViewport({ phone: false });
    const twoLanes = render(view([permanent("tamer")]));
    const twoLaneWidth = renderHook(useFieldCardWidth).result.current!;
    twoLanes.unmount();

    setBattleLanes(BattleLanes.One);
    render(view([permanent("tamer")]));
    const oneLane = renderHook(useFieldCardWidth).result.current!;
    expect(oneLane.drawn).toBeGreaterThan(twoLaneWidth.drawn);
    expect(oneLane.beside).toBe(twoLaneWidth.drawn);
    expect(oneLane.heightFitted).toBe(twoLaneWidth.heightFitted);
  });
});
