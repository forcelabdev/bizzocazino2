#!/bin/bash

URL="https://apibizzocasino.site/drakon_api"
DATA='{"method": "authenticate"}'

curl -X POST -H "Content-Type: application/json" -d "$DATA" "$URL"
