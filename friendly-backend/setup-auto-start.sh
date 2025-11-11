#!/bin/bash

# Setup PM2 to auto-start on system boot
# This script needs to be run once to enable auto-start

echo "Setting up PM2 auto-start on boot..."
echo ""

# Run the PM2 startup command
sudo env PATH=$PATH:/Users/anubilegdemberel/.nvm/versions/node/v20.19.4/bin /Users/anubilegdemberel/.nvm/versions/node/v20.19.4/lib/node_modules/pm2/bin/pm2 startup launchd -u anubilegdemberel --hp /Users/anubilegdemberel

echo ""
echo "✅ PM2 auto-start configured!"
echo "The backend server will now start automatically when your Mac boots up."

