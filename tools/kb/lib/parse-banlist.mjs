// Parse the banned/restricted announcement page.
//
// The page is an event log, not a flat list: it is organised as
//   <h4>Effective on <date></h4>            -> sets effective date, action=restrict
//   <h5>Banned cards: ...</h5>              -> sets status (banned)
//   <h5>Restricted Cards (1) - ...</h5>     -> sets status (restricted, count)
//   <h4>Restricted cards that will be lifted</h4> -> action=lift
//   <div class="restrictionCol">...<dd>CARDID<br>Name</dd>...</div> -> a card event
//
// We scan markers in document order to build `events`, then fold them by
// (effectiveDate, order) into the resulting `current` status per card. Component
// cards of (legacy) banned pairs live in <ul class="noticeList"><li> and are
// intentionally not matched as restricted cards.

import { textOf, parseDate } from "./html.mjs";
import { SOURCES } from "./paths.mjs";

const TOKEN_RE = new RegExp(
  [
    "<h4[^>]*>([\\s\\S]*?)<\\/h4>",
    "<h5[^>]*>([\\s\\S]*?)<\\/h5>",
    "<dd>\\s*([A-Z0-9]+-\\d+[A-Z0-9]*)\\s*<br\\s*\\/?>([\\s\\S]*?)<\\/dd>",
  ].join("|"),
  "g",
);

function classifyStatus(text) {
  const lower = text.toLowerCase();
  if (lower.includes("banned pair")) return { status: "banned_pair", count: 0 };
  if (lower.includes("banned")) return { status: "banned", count: 0 };
  if (lower.includes("restricted")) {
    const countMatch = text.match(/\((\d+)\)/);
    return { status: "restricted", count: countMatch ? Number(countMatch[1]) : 1 };
  }
  return null;
}

export function parseBanlist(html) {
  const events = [];
  let effectiveDate = null;
  let status = null;
  let count = 0;
  let action = "restrict";

  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(html))) {
    if (match[1] !== undefined) {
      const text = textOf(match[1]);
      if (/effective on/i.test(text)) {
        effectiveDate = parseDate(text);
        action = "restrict";
      } else if (/will be lifted|lifted/i.test(text)) {
        action = "lift";
      }
    } else if (match[2] !== undefined) {
      const classified = classifyStatus(textOf(match[2]));
      if (classified) {
        status = classified.status;
        count = classified.count;
      }
    } else if (match[3] !== undefined) {
      events.push({
        cardId: match[3],
        name: textOf(match[4]),
        status,
        count,
        effectiveDate,
        action,
      });
    }
  }

  const current = foldEvents(events);
  return { source: SOURCES.banlist, events, current };
}

function foldEvents(events) {
  const ordered = events
    .map((event, order) => ({ event, order }))
    .sort((a, b) => {
      const dateA = a.event.effectiveDate ?? "";
      const dateB = b.event.effectiveDate ?? "";
      if (dateA !== dateB) return dateA < dateB ? -1 : 1;
      return a.order - b.order;
    });

  const current = {};
  for (const { event } of ordered) {
    if (event.action === "lift") {
      delete current[event.cardId];
      continue;
    }
    current[event.cardId] = {
      cardId: event.cardId,
      name: event.name,
      status: event.status,
      count: event.count,
      effectiveDate: event.effectiveDate,
    };
  }
  return current;
}
