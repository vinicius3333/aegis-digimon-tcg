# Auto hatch (#5364)

Add an opt-in switch to the match settings board panel. Auto hatch defaults to false.
Store the boolean locally for immediate updates and sync it through the existing
account preferences API. The account value wins on sign-in; an account without a
saved choice uses false. Automation waits until the current account preferences
finish loading. Guests retain their choice on the device.

The client sends the existing server-validated hatch intent during its own breeding
phase, only when normal breeding actions are open, the breeding area is empty, and
Digi-Eggs remain. It waits for decision and presentation locks, requires a connected
room with both players seated, and sends once per room, turn, and seat. Spectators
have no action room and cannot hatch. No game rules or card modules change.

Validate the settings switch, account loading and updates (including false and
switching accounts), API boolean validation, action guards, and duplicate prevention
through rerenders and StrictMode. Run typechecks and the affected application tests.
