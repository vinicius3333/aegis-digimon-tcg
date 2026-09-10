# BT1 re-audit review notes

## Open engine seams

None recorded yet.

## Coordinator decisions

- Audit starts from current local main f01ed2630 so the already committed breeding-trigger engine fix is included.
- Heavy tests are serialized; no concurrent collection runs while disk is critically low.
