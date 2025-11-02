#!/bin/bash

# Google Sign-In Setup Helper Script
# This script helps you get the SHA-1 fingerprint needed for Google Cloud Console

echo "🔐 Google Sign-In Setup Helper"
echo "=============================="
echo ""

echo "📱 Getting SHA-1 fingerprint for Android..."
echo ""

# Check if expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI not found. Please install it first:"
    echo "   npm install -g @expo/cli"
    exit 1
fi

echo "🔍 Running expo credentials:manager..."
echo "   This will show your SHA-1 fingerprint for development builds"
echo ""

# Run expo credentials manager
expo credentials:manager

echo ""
echo "📋 Next steps:"
echo "1. Copy the SHA-1 fingerprint from above"
echo "2. Go to Google Cloud Console > APIs & Services > Credentials"
echo "3. Create/edit your Android OAuth 2.0 Client ID"
echo "4. Add the SHA-1 fingerprint to your Android client"
echo "5. Update the client IDs in src/services/auth/authService.ts"
echo ""
echo "📖 For detailed instructions, see GOOGLE_SIGNIN_SETUP.md"
