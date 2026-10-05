#!/bin/sh
set -eu
source_path=/etc/dokploy/compose/aegis-rgise8/code
if [ -d /opt/aegis-rollout/deploy.lock ]; then
  echo 'Maintenance skipped: deployment lock is present'
  exit 0
fi
if ! docker image inspect aegis-deployer:1 >/dev/null 2>&1; then
  docker compose -p aegis-deployer -f "$source_path/docker-compose.deployer.yml" build deployer
fi
exec docker compose -p aegis-deployer -f "$source_path/docker-compose.deployer.yml" run --rm --no-build --no-deps deployer maintenance --source "$source_path" --env-file "$source_path/.env" "$@"
