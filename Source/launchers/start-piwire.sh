#!/bin/sh
cd -P "$(dirname "$0")" || exit 1

if [ "$(uname -m)" != x86_64 ]; then
    echo "PiWire benötigt Linux x86_64. Erkannt: $(uname -m)." >&2
    exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
    echo "Bitte PiWire als angemeldeter Benutzer ohne sudo starten." >&2
    exit 1
fi

if [ ! -x ./piwire ] || [ ! -f ./resources/app/web/index.html ]; then
    echo "PiWire-Dateien fehlen oder sind nicht ausführbar. Bitte das TAR.GZ vollständig neu entpacken." >&2
    exit 1
fi

exec ./piwire "$@"
