// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { PermanentView } from "./boardPieces";

afterEach(() => cleanup());

function opponentWithDpDown(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "opponent-target";
  permanent.controllerSeat = 1;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "opponent-target-top",
    cardId: "BT1-043",
  });
  permanent.baseDP = 16_000;
  permanent.currentDP = 10_000;
  return permanent;
}

function blackWarGreymonWithInheritedDpUp(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "black-war-greymon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "black-war-greymon-top",
    cardId: "BT5-069",
  });
  permanent.baseDP = 12_000;
  permanent.currentDP = 14_000;
  return permanent;
}

function memoryBoostWithDelay(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "blue-memory-boost";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "blue-memory-boost-top",
    cardId: "P-036",
  });
  permanent.activatableEffectsJson = JSON.stringify([
    {
      instanceId: "blue-memory-boost-top",
      effectKey: "P-036/0",
      description: "[Main] <Delay> Gain 2 memory.",
    },
  ]);
  return permanent;
}

function herculesKabuterimonWithDigiBurst(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "hercules-kabuterimon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "hercules-kabuterimon-top",
    cardId: "ST4-13",
  });
  for (let index = 0; index < 5; index += 1) {
    permanent.stack.push(
      Object.assign(new CardInstance(), {
        instanceId: `hercules-source-${index}`,
        cardId: index === 4 ? "ST4-11" : "ST4-03",
      }),
    );
  }
  permanent.baseDP = 12_000;
  permanent.currentDP = 13_000;
  permanent.activatableEffectsJson = JSON.stringify([
    {
      instanceId: "hercules-kabuterimon-top",
      effectKey: "ST4-13/ir-27-0",
      description: "[Main] ＜DigiBurst＞ Trash, Suspend",
    },
  ]);
  return permanent;
}

function sistermonWithGrantedDecoy(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "sistermon-blanc";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "sistermon-blanc-top",
    cardId: "ST12-12",
  });
  permanent.keywords.push("Decoy");
  permanent.grantedKeywords.push("Decoy");
  return permanent;
}

function suspendedExTyrannomon(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "ex-tyrannomon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "ex-tyrannomon-top",
    cardId: "EX3-060",
  });
  permanent.stack.push(
    Object.assign(new CardInstance(), {
      instanceId: "toy-agumon-source",
      cardId: "BT2-055",
    }),
  );
  permanent.baseDP = 9000;
  permanent.currentDP = 9000;
  permanent.isSuspended = true;
  permanent.grantedKeywords.push("Blocker");
  return permanent;
}

function permanentWithKeywords({ cardId, keywords }: { cardId: string; keywords: string[] }): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = `${cardId}-permanent`;
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: `${cardId}-top`,
    cardId,
  });
  permanent.grantedKeywords.push(...keywords);
  return permanent;
}

function darkdramonWithCyberdramonDpBonus(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "darkdramon-with-cyberdramon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), {
    instanceId: "darkdramon-top",
    cardId: "EX3-054",
  });
  permanent.stack.push(
    Object.assign(new CardInstance(), {
      instanceId: "cyberdramon-source",
      cardId: "EX3-050",
    }),
  );
  permanent.baseDP = 12_000;
  permanent.currentDP = 14_000;
  return permanent;
}

describe("PermanentView DP changes", () => {
  it("shows Cyberdramon's inherited +2000 DP on its Cyborg/D-Brigade carrier", () => {
    render(
      <I18nProvider>
        <PermanentView perm={darkdramonWithCyberdramonDpBonus()} onClick={vi.fn<() => void>()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Darkdramon, 14,000 DP, DP \+2K/i })).toBeTruthy();
    expect(screen.getByText("14K")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "↑DP 2K")).toBeTruthy();
  });

  it("labels a DP reduction explicitly on the affected Digimon", () => {
    render(
      <I18nProvider>
        <PermanentView perm={opponentWithDpDown()} />
      </I18nProvider>,
    );

    expect(screen.getByText((_, element) => element?.textContent === "↓DP 6K")).toBeTruthy();
  });

  it("renders BT5-068's inherited +2000 DP from the synchronized current DP", () => {
    render(
      <I18nProvider>
        <PermanentView perm={blackWarGreymonWithInheritedDpUp()} />
      </I18nProvider>,
    );

    expect(screen.getByText((_, element) => element?.textContent === "↑DP 2K")).toBeTruthy();
    expect(screen.getByText("14K")).toBeTruthy();
  });
});

describe("PermanentView resolved keywords", () => {
  it("shows a surviving ExTyrannomon blocker sideways and labels it as suspended", () => {
    render(
      <I18nProvider>
        <PermanentView perm={suspendedExTyrannomon()} onClick={vi.fn<() => void>()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /ExTyrannomon.*Suspended/i })).toBeTruthy();
    const card = screen.getByTitle("ExTyrannomon");
    expect(card.dataset.state).toBe("suspended");
    expect(card.style.rotate).toBe("90deg");
    expect(screen.getByText("Blocker")).toBeTruthy();
  });

  it("shows Sealsdramon's Jamming and the newly played D-Brigade's granted Rush independently", () => {
    render(
      <I18nProvider>
        <>
          <PermanentView perm={permanentWithKeywords({ cardId: "EX3-049", keywords: ["Jamming"] })} />
          <PermanentView perm={permanentWithKeywords({ cardId: "EX3-046", keywords: ["Rush"] })} />
        </>
      </I18nProvider>,
    );

    expect(screen.getByLabelText("Active keywords: Jamming")).toBeTruthy();
    expect(screen.getByLabelText("Active keywords: Rush")).toBeTruthy();
    expect(screen.getByText("Jamming")).toBeTruthy();
    expect(screen.getByText("Rush")).toBeTruthy();
  });

  it("shows ST12-12's dynamically granted Decoy directly on the board", () => {
    render(
      <I18nProvider>
        <PermanentView perm={sistermonWithGrantedDecoy()} />
      </I18nProvider>,
    );

    expect(screen.getByText("Decoy")).toBeTruthy();
    expect(screen.getByLabelText("Active keywords: Decoy")).toBeTruthy();
  });

  it("shows at most three granted keywords and summarizes the remainder", () => {
    const permanent = sistermonWithGrantedDecoy();
    permanent.grantedKeywords.push("Blocker", "Reboot", "Jamming");
    render(
      <I18nProvider>
        <PermanentView perm={permanent} />
      </I18nProvider>,
    );

    expect(screen.getByText("Decoy")).toBeTruthy();
    expect(screen.getByText("Blocker")).toBeTruthy();
    expect(screen.getByText("Reboot")).toBeTruthy();
    expect(screen.queryByText("Jamming")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });
});

describe("PermanentView activatable effects", () => {
  // The activation control itself lives in the card action menu
  // (cardActionSheet.test.tsx); the card only shows the permanent's own state.
  it("carries no effect control on the card", () => {
    render(
      <I18nProvider>
        <PermanentView perm={memoryBoostWithDelay()} onClick={vi.fn<() => void>()} />
      </I18nProvider>,
    );

    expect(screen.queryByRole("button", { name: /activate effect/i })).toBeNull();
    expect(screen.queryByText("Main")).toBeNull();
  });

  it("surfaces HerculesKabuterimon's synchronized source count and DP", () => {
    render(
      <I18nProvider>
        <PermanentView perm={herculesKabuterimonWithDigiBurst()} />
      </I18nProvider>,
    );

    expect(screen.getByText("×5")).toBeTruthy();
    expect(screen.getByText("13K")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "↑DP 1K")).toBeTruthy();
  });
});

describe("summoning sickness ring", () => {
  function freshlyPlayed(summoningSick: boolean): Permanent {
    const permanent = new Permanent();
    permanent.permanentId = "fresh";
    permanent.controllerSeat = 0;
    permanent.topCard = Object.assign(new CardInstance(), { instanceId: "fresh-top", cardId: "BT1-043" });
    permanent.baseDP = 16_000;
    permanent.currentDP = 16_000;
    permanent.summoningSick = summoningSick;
    return permanent;
  }

  it("orbits stars over a permanent the server says cannot attack yet", () => {
    const { container } = render(
      <I18nProvider>
        <PermanentView perm={freshlyPlayed(true)} onClick={vi.fn<() => void>()} />
      </I18nProvider>,
    );

    const stars = container.querySelectorAll(".game-summoning-ring i");
    expect(stars).toHaveLength(6);
    // Each star rests at its own point on the ellipse, so a stopped orbit is still a ring.
    expect((stars[3] as HTMLElement).style.offsetDistance).toBe("50%");
    expect(screen.getByRole("button", { name: /Can't attack yet/i })).toBeTruthy();
  });

  it("shows nothing once the server clears the flag", () => {
    const { container } = render(
      <I18nProvider>
        <PermanentView perm={freshlyPlayed(false)} onClick={vi.fn<() => void>()} />
      </I18nProvider>,
    );

    expect(container.querySelector(".game-summoning-ring")).toBeNull();
  });
});
