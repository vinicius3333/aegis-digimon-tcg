// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { PermanentView } from "./piece";

afterEach(() => cleanup());

function blockerWithStack(): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "greymon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), { instanceId: "greymon-top", cardId: "ST1-07" });
  permanent.stack.push(Object.assign(new CardInstance(), { instanceId: "agumon", cardId: "ST1-03" }));
  permanent.keywords.push("Blocker");
  permanent.grantedKeywords.push("Blocker");
  permanent.cannotAttack = true;
  permanent.baseDP = 5000;
  permanent.currentDP = 3000;
  return permanent;
}

function renderPermanent(onClick = vi.fn<() => void>()) {
  render(
    <I18nProvider>
      <PermanentView perm={blockerWithStack()} onClick={onClick} />
    </I18nProvider>,
  );
  return onClick;
}

it("explains a keyword badge on tap without acting on the card", () => {
  const onClick = renderPermanent();
  fireEvent.click(screen.getByText("Blocker"));
  const hint = screen.getByRole("tooltip");
  expect(hint.textContent).toContain("you may suspend this Digimon");
  expect(onClick).not.toHaveBeenCalled();

  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("explains the stack count, a restriction and the DP change", () => {
  renderPermanent();
  fireEvent.click(screen.getByText("×1"));
  expect(screen.getByRole("tooltip").textContent).toContain("1 digivolution cards under this Digimon.");

  fireEvent.click(document.querySelector('[data-label="Can\'t attack"]')!);
  expect(screen.getByRole("tooltip").textContent).toContain("stops this Digimon from attacking");

  fireEvent.click(document.querySelector('[data-dp="down"]')!);
  expect(screen.getAllByRole("tooltip")).toHaveLength(1);
  expect(screen.getByRole("tooltip").textContent).toContain("Printed 5,000 DP, lowered by 2,000 by effects.");
});
