# BT26-069 hand-trash watcher mechanism

## Red evidence

The original retained scenarios did not reach the claimed engine seam. The first
fixture played BT26-083 without security cards, so its delete-per-security-trash
effect had no deletion target. The second played BT26-072 from hand, although
BT26-072's hand-trash clause is inherited and only exists while it is in a
digivolution stack.

## Corrected public regression

- BT26-083 is played with inert security Digimon. Its public On Play effect
  trashes security, deletes the opponent's BT26-082, and BT26-082's On Deletion
  effect trashes the controller's hand. BT26-069 inherited from the host then
  observes that hand-trash event and digivolves the host into P-209.
- A host carrying inherited BT26-072 is deleted by a public BT26-071 On Play
  effect. BT26-072's inherited On Deletion effect trashes the opponent's hand;
  BT26-069 remains BT26-074 because the trashed hand belongs to the opponent.

Both paths pass through the production effect, deletion, trash, and sub-trigger
dispatch paths. The focused BT26-069 suite is green at 11/11. No engine change
was necessary after the fixtures were made semantically valid.
