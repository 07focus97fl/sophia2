#!/bin/bash

ENV_LOCAL_PATH=/app/.env.local

if test -z "${DOTENV_LOCAL}" ; then
    if ! test -f "${ENV_LOCAL_PATH}" ; then
        echo "DOTENV_LOCAL was not found in the ENV variables and .env.local is not set using a bind volume. Make sure to set environment variables properly. "
    fi;
else
    echo "DOTENV_LOCAL was found in the ENV variables. Creating .env.local file."
    cat <<< "$DOTENV_LOCAL" > ${ENV_LOCAL_PATH}
fi;

echo "Starting local MongoDB instance"
nohup mongod &

export PUBLIC_VERSION=$(node -p "require('./package.json').version")

dotenv -e /app/.env.local -c -- python /app/backend/main.py