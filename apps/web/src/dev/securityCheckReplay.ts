/* The security check from a real match log, batch by batch in the order the engine now
   emits it: the [Security] clause plays BT10-087 onto the field (batches 1-3), the Tamer's
   [On Play] reveals and sorts four cards (4-8), the turn player's whenSecurityRemoved chain
   runs (9-18), and the check closes last. Replayed through the normal cue pipeline so the
   demo shows exactly what a match shows. */

import type { ServerEvent } from "@aegis/shared";

export const SECURITY_CHECK_REPLAY: readonly (readonly ServerEvent[])[] = [
  [
    {
      "kind": "securityRevealed",
      "artId": "BT10-087",
      "attackerArtId": "EX12-046",
      "attackerDP": 7000,
      "seat": 1,
      "revealedCardId": "BT10-087",
      "attackerPermanentId": "perm-1",
      "hasSecurityEffect": true,
      "isDigimon": false
    },
    {
      "kind": "effectTriggered",
      "seat": 1,
      "sourceCardId": "BT10-087",
      "sourceInstanceId": "s1-41",
      "effectKey": "BT10-087/ir-26-0",
      "description": "[Security] Play without paying the cost",
      "timing": "Security",
      "duringSecurityCheck": true
    }
  ],
  [
    {
      "kind": "cardPlayed",
      "seat": 1,
      "cardId": "BT10-087",
      "artId": "BT10-087",
      "permanentId": "perm-4"
    },
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s1-41"
      ],
      "from": "various",
      "to": "battleArea",
      "cardIds": [
        "BT10-087"
      ]
    }
  ],
  [
    {
      "kind": "effectResolved",
      "seat": 1,
      "sourceCardId": "BT10-087",
      "sourceInstanceId": "s1-41",
      "sourcePermanentId": "perm-4",
      "effectKey": "BT10-087/ir-26-0",
      "description": "[Security] Play without paying the cost",
      "timing": "Security"
    }
  ],
  [
    {
      "kind": "effectTriggered",
      "seat": 1,
      "sourceCardId": "BT10-087",
      "sourceInstanceId": "s1-41",
      "sourcePermanentId": "perm-4",
      "effectKey": "BT10-087/ir-6-0",
      "description": "[OnPlay] Reveal top 4 and add",
      "timing": "OnPlay",
      "duringSecurityCheck": true
    },
    {
      "kind": "cardRevealed",
      "seat": 1,
      "cardId": "BT19-061",
      "artId": "BT19-061"
    },
    {
      "kind": "cardRevealed",
      "seat": 1,
      "cardId": "P-224",
      "artId": "P-224"
    },
    {
      "kind": "cardRevealed",
      "seat": 1,
      "cardId": "BT19-038",
      "artId": "BT19-038"
    },
    {
      "kind": "cardRevealed",
      "seat": 1,
      "cardId": "BT19-014",
      "artId": "BT19-014"
    }
  ],
  [
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s1-10"
      ],
      "from": "various",
      "to": "hand",
      "cardIds": [
        "BT19-061"
      ]
    }
  ],
  [
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s1-25"
      ],
      "from": "various",
      "to": "battleArea",
      "cardIds": [
        "BT19-014"
      ]
    }
  ],
  [
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s1-36",
        "s1-33"
      ],
      "from": "various",
      "to": "deckBottom",
      "cardIds": [
        "P-224",
        "BT19-038"
      ]
    }
  ],
  [
    {
      "kind": "effectResolved",
      "seat": 1,
      "sourceCardId": "BT10-087",
      "sourceInstanceId": "s1-41",
      "sourcePermanentId": "perm-4",
      "effectKey": "BT10-087/ir-6-0",
      "description": "[OnPlay] Reveal top 4 and add",
      "timing": "OnPlay"
    }
  ],
  [
    {
      "kind": "effectTriggered",
      "seat": 0,
      "sourceCardId": "EX12-046",
      "sourceInstanceId": "s0-27",
      "sourcePermanentId": "perm-1",
      "effectKey": "subtrigger/19/whenSecurityRemoved",
      "description": "whenSecurityRemoved",
      "timing": "whenSecurityRemoved",
      "printedTiming": "YourTurn",
      "duringSecurityCheck": true
    }
  ],
  [
    {
      "kind": "memoryChanged",
      "from": -2,
      "to": -3,
      "reason": "digivolve"
    },
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s0-32"
      ],
      "from": "various",
      "to": "battleArea",
      "cardIds": [
        "EX12-065"
      ]
    },
    {
      "kind": "digivolved",
      "seat": 0,
      "permanentId": "perm-1",
      "cardId": "EX12-065",
      "artId": "EX12-065",
      "mechanic": "normal",
      "inBreeding": false
    },
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s0-49"
      ],
      "from": "deck",
      "to": "hand",
      "seat": 0,
      "drawReason": "digivolution"
    }
  ],
  [
    {
      "kind": "effectResolved",
      "seat": 0,
      "sourceCardId": "EX12-046",
      "sourceInstanceId": "s0-27",
      "sourcePermanentId": "perm-1",
      "effectKey": "subtrigger/19/whenSecurityRemoved",
      "description": "whenSecurityRemoved",
      "timing": "whenSecurityRemoved"
    }
  ],
  [
    {
      "kind": "effectTriggered",
      "seat": 0,
      "sourceCardId": "EX12-065",
      "sourceInstanceId": "s0-32",
      "sourcePermanentId": "perm-1",
      "effectKey": "EX12-065/ir-shared-0",
      "description": "[WhenDigivolving] Play without paying the cost",
      "timing": "WhenDigivolving",
      "duringSecurityCheck": true
    }
  ],
  [
    {
      "kind": "cardPlayed",
      "seat": 0,
      "cardId": "EX12-009",
      "artId": "EX12-009",
      "permanentId": "perm-5"
    },
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s0-7"
      ],
      "from": "various",
      "to": "battleArea",
      "cardIds": [
        "EX12-009"
      ]
    }
  ],
  [
    {
      "kind": "effectResolved",
      "seat": 0,
      "sourceCardId": "EX12-065",
      "sourceInstanceId": "s0-32",
      "sourcePermanentId": "perm-1",
      "effectKey": "EX12-065/ir-shared-0",
      "description": "[WhenDigivolving] Play without paying the cost",
      "timing": "WhenDigivolving"
    }
  ],
  [
    {
      "kind": "effectTriggered",
      "seat": 0,
      "sourceCardId": "EX12-009",
      "sourceInstanceId": "s0-7",
      "sourcePermanentId": "perm-5",
      "effectKey": "EX12-009/ir-6-0",
      "description": "[OnPlay] Reveal top 3 and add",
      "timing": "OnPlay",
      "duringSecurityCheck": true
    },
    {
      "kind": "cardRevealed",
      "seat": 0,
      "cardId": "EX12-065",
      "artId": "EX12-065"
    },
    {
      "kind": "cardRevealed",
      "seat": 0,
      "cardId": "EX12-074",
      "artId": "EX12-074"
    },
    {
      "kind": "cardRevealed",
      "seat": 0,
      "cardId": "EX12-063",
      "artId": "EX12-063"
    }
  ],
  [
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s0-21",
        "s0-43"
      ],
      "from": "various",
      "to": "hand",
      "cardIds": [
        "EX12-065",
        "EX12-074"
      ]
    }
  ],
  [
    {
      "kind": "cardsMoved",
      "instanceIds": [
        "s0-33"
      ],
      "from": "various",
      "to": "deckBottom",
      "cardIds": [
        "EX12-063"
      ]
    }
  ],
  [
    {
      "kind": "effectResolved",
      "seat": 0,
      "sourceCardId": "EX12-009",
      "sourceInstanceId": "s0-7",
      "sourcePermanentId": "perm-5",
      "effectKey": "EX12-009/ir-6-0",
      "description": "[OnPlay] Reveal top 3 and add",
      "timing": "OnPlay"
    }
  ],
  [
    {
      "kind": "securityChecked",
      "artId": "BT10-087",
      "attackerArtId": "EX12-065",
      "seat": 1,
      "revealedCardId": "BT10-087",
      "resolution": "effect"
    }
  ]
] as unknown as readonly (readonly ServerEvent[])[];
