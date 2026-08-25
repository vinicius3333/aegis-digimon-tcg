// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { isBoardShowcasePath } from "../App";
import { BoardShowcase } from "./BoardShowcase";

afterEach(() => cleanup());

const SECTION_IDS = [
  "showcase-memory-gauge",
  "showcase-memory-arc",
  "showcase-turn-control",
  "showcase-breeding-mode",
  "showcase-drag-intents",
  "showcase-hand",
  "showcase-permanents",
  "showcase-breeding",
  "showcase-security",
  "showcase-shield-break",
  "showcase-security-branch",
  "showcase-summoning-ring",
  "showcase-turn-banner",
  "showcase-attack-arc",
  "showcase-side-panels",
  "showcase-notices",
  "showcase-dialogs",
  "showcase-cut-in",
  "showcase-permanent-inspector",
  "showcase-effect-sources",
  "showcase-tracking-arrow",
  "showcase-security-chrome",
  "showcase-deck-chrome",
  "showcase-shatter",
  "showcase-card-inspect",
  "showcase-security-outcome",
  "showcase-play-log",
];

describe("BoardShowcase", () => {
  it("renders every screenshot section", () => {
    const { container } = render(
      <I18nProvider>
        <BoardShowcase />
      </I18nProvider>,
    );

    for (const id of SECTION_IDS) {
      expect(container.querySelector(`#${id}`), `missing section ${id}`).not.toBeNull();
    }
  });

  it("routes only the dev showcase path", () => {
    expect(isBoardShowcasePath("/dev/board")).toBe(true);
    expect(isBoardShowcasePath("/dev/board/")).toBe(true);
    expect(isBoardShowcasePath("/dev/boards")).toBe(false);
    expect(isBoardShowcasePath("/")).toBe(false);
  });
});
