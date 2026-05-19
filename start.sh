#!/bin/bash
set -e

cd "$(dirname "$0")/backend"
./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
