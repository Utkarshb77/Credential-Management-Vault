#!/bin/bash

# Simulate rotating a TLS certificate
# Generating a dummy certificate string

echo "CERTIFICATE-$(date +%s)-$(openssl rand -hex 8)"
