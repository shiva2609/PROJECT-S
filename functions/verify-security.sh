#!/bin/bash

# Security Verification Script for Gemini API Key Configuration
# This script verifies that API keys are properly secured

echo "🔍 Security Verification for Gemini API Key"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Verify .env is gitignored
echo "1️⃣  Checking .gitignore configuration..."
if grep -q "^\.env$" functions/.gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env is NOT in .gitignore${NC}"
    ((ERRORS++))
fi

# Check 2: Verify .env is not committed
echo ""
echo "2️⃣  Checking if .env is committed to Git..."
if git ls-files | grep -q "^functions/\.env$"; then
    echo -e "${RED}❌ CRITICAL: .env is committed to Git!${NC}"
    echo "   Run: git rm --cached functions/.env"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ .env is NOT committed${NC}"
fi

# Check 3: Verify no hardcoded API keys in client code
echo ""
echo "3️⃣  Checking client code for hardcoded API keys..."
CLIENT_KEYS=$(grep -r "AIza" src/ 2>/dev/null | grep -v "AIzaSyC" | grep -v "AIzaSyD" | grep -v "AIzaSyA" || true)
if [ -z "$CLIENT_KEYS" ]; then
    echo -e "${GREEN}✅ No Gemini API keys in client code${NC}"
else
    echo -e "${RED}❌ Found potential API keys in client:${NC}"
    echo "$CLIENT_KEYS"
    ((ERRORS++))
fi

# Check 4: Verify no GoogleGenerativeAI imports in client
echo ""
echo "4️⃣  Checking for Gemini SDK imports in client..."
if grep -r "GoogleGenerativeAI" src/ 2>/dev/null | grep -q "import"; then
    echo -e "${RED}❌ Found Gemini SDK imports in client code${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ No Gemini SDK imports in client${NC}"
fi

# Check 5: Verify no hardcoded keys in functions source
echo ""
echo "5️⃣  Checking functions source for hardcoded keys..."
FUNC_KEYS=$(grep -r "AIza" functions/src/ 2>/dev/null || true)
if [ -z "$FUNC_KEYS" ]; then
    echo -e "${GREEN}✅ No hardcoded keys in functions source${NC}"
else
    echo -e "${YELLOW}⚠️  Found 'AIza' in functions (check if it's just comments):${NC}"
    echo "$FUNC_KEYS"
    ((WARNINGS++))
fi

# Check 6: Verify .env.example exists
echo ""
echo "6️⃣  Checking for .env.example template..."
if [ -f "functions/.env.example" ]; then
    echo -e "${GREEN}✅ .env.example exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env.example not found${NC}"
    ((WARNINGS++))
fi

# Check 7: Verify functions package.json has correct dependencies
echo ""
echo "7️⃣  Checking functions dependencies..."
if grep -q "@google/generative-ai" functions/package.json; then
    echo -e "${GREEN}✅ Gemini SDK in functions dependencies${NC}"
else
    echo -e "${RED}❌ Gemini SDK missing from functions${NC}"
    ((ERRORS++))
fi

if grep -q "dotenv" functions/package.json; then
    echo -e "${GREEN}✅ dotenv in functions devDependencies${NC}"
else
    echo -e "${YELLOW}⚠️  dotenv missing (needed for local development)${NC}"
    ((WARNINGS++))
fi

# Check 8: Verify client package.json does NOT have Gemini SDK
echo ""
echo "8️⃣  Checking client dependencies..."
if grep -q "@google/generative-ai" package.json; then
    echo -e "${RED}❌ CRITICAL: Gemini SDK in client dependencies!${NC}"
    echo "   Run: npm uninstall @google/generative-ai"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ No Gemini SDK in client dependencies${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Verification Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Configuration is secure.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) found (non-critical)${NC}"
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} error(s) found - SECURITY ISSUES DETECTED${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) also found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
