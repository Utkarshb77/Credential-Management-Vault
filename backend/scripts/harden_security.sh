#!/bin/bash

# Restrict access to the vault directory and sensitive files
# Only the current user should be able to read/write

echo "Applying Unix file permissions security..."

# Set directory permissions to 700 (rwx for owner only)
chmod 700 /Users/vaibhavmishra/.gemini/antigravity/scratch/credential-vault

# Set sensitive file permissions to 600 (rw for owner only)
if [ -f "/Users/vaibhavmishra/.gemini/antigravity/scratch/credential-vault/.env" ]; then
    chmod 600 /Users/vaibhavmishra/.gemini/antigravity/scratch/credential-vault/.env
    echo "Secured .env file."
fi

# Secure policy files
chmod 600 /Users/vaibhavmishra/.gemini/antigravity/scratch/credential-vault/policies/*.json
echo "Secured policy files."

# Secure scripts
chmod 700 /Users/vaibhavmishra/.gemini/antigravity/scratch/credential-vault/scripts/*.sh
echo "Secured rotation scripts."

echo "Vault security hardened."
