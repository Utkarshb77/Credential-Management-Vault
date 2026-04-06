#!/bin/bash

# Simulate rotating an API key
# Generating a random hex string to represent the new key

NEW_KEY=$(openssl rand -hex 16)
echo "$NEW_KEY"
