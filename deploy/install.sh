#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "install.sh must run as root" >&2
  exit 1
fi

install_root=${AEGIS_INSTALL_ROOT:-/opt/aegis-deploy}
state_root=${AEGIS_DEPLOY_ROOT:-/var/lib/aegis-deploy}
config_root=${AEGIS_DEPLOY_CONFIG_ROOT:-/etc/aegis-deploy}

test -f "$config_root/api.env" || {
  echo "Missing $config_root/api.env; copy deploy/api.env.example and add production secrets first." >&2
  exit 1
}
test -f "$config_root/controller.env" || {
  echo "Missing $config_root/controller.env; configure the legacy container names before installation." >&2
  exit 1
}

mkdir -p "$install_root/releases" "$state_root/router" "$state_root/public" "$config_root"
chmod 700 "$config_root" "$state_root"
chmod 600 "$config_root/api.env" "$config_root/controller.env"

install -m 0644 deploy/aegis-deploy.service /etc/systemd/system/aegis-deploy.service
install -m 0644 deploy/aegis-deploy.timer /etc/systemd/system/aegis-deploy.timer

docker network inspect aegis_default >/dev/null
docker volume inspect aegis-rgise8_postgres_data >/dev/null
command -v node >/dev/null || {
  echo "Node.js must be installed in root's PATH for the deployment controller." >&2
  exit 1
}
systemctl daemon-reload

echo "Aegis deploy controller installed but not enabled. Run the bootstrap canary before enabling aegis-deploy.timer."
