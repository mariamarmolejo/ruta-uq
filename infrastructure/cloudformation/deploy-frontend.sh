#!/usr/bin/env bash
# =============================================================================
# RutaUQ — Frontend Deploy Script
#
# Builds the Next.js static export and pushes it to S3 + invalidates CloudFront.
#
# Usage:
#   export AWS_PROFILE=dev (create reference to AWS credentials in ~/.aws/credentials)
#   ./deploy-frontend.sh dev
#
# Prerequisites:
#   - CDN stack deployed: ./deploy.sh dev cdn
#   - ECS stack deployed: ./deploy.sh dev ecs  (to get the API URL)
#   - .env.production filled in with real values (see rutauq-frontend/.env.production)
#   - Node.js and npm installed in the frontend project
# =============================================================================

set -euo pipefail

ENVIRONMENT=${1:-dev}

PROJECT="rutauq"
REGION="us-east-1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/../../rutauq-frontend"

CDN_STACK="${PROJECT}-${ENVIRONMENT}-cdn"

# -----------------------------------------------------------------------------
# Fetch stack outputs
# -----------------------------------------------------------------------------

echo ""
echo "==> Fetching stack outputs..."

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${CDN_STACK}" \
  --region     "${REGION}" \
  --query      "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output     text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "${CDN_STACK}" \
  --region     "${REGION}" \
  --query      "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output     text)

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name "${CDN_STACK}" \
  --region     "${REGION}" \
  --query      "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output     text)

# ApiHttpsUrl already includes /api/v1 (e.g. https://xxx.cloudfront.net/api/v1)
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "${CDN_STACK}" \
  --region     "${REGION}" \
  --query      "Stacks[0].Outputs[?OutputKey=='ApiHttpsUrl'].OutputValue" \
  --output     text)

if [[ -z "${API_URL}" || "${API_URL}" == "None" ]]; then
  echo "ERROR: Could not resolve ApiHttpsUrl from stack '${CDN_STACK}'."
  echo "Make sure the CDN stack is deployed: ./deploy.sh ${ENVIRONMENT} cdn"
  exit 1
fi

echo "    Bucket:          ${BUCKET_NAME}"
echo "    Distribution ID: ${DISTRIBUTION_ID}"
echo "    Frontend URL:    ${FRONTEND_URL}"
echo "    API URL:         ${API_URL}"

# -----------------------------------------------------------------------------
# Write .env.production with live values
# -----------------------------------------------------------------------------

echo ""
echo "==> Writing .env.production..."

# Read the existing MP public key so we don't overwrite it
MP_KEY=$(grep "^NEXT_PUBLIC_MP_PUBLIC_KEY=" "${FRONTEND_DIR}/.env.production" \
  | cut -d= -f2- || echo "REPLACE_WITH_MP_PUBLIC_KEY")

cat > "${FRONTEND_DIR}/.env.production" <<EOF
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_MP_PUBLIC_KEY=${MP_KEY}
EOF

echo "    NEXT_PUBLIC_API_URL=${API_URL}"

# -----------------------------------------------------------------------------
# Build Next.js static export
# -----------------------------------------------------------------------------

echo ""
echo "==> Building Next.js static export..."
cd "${FRONTEND_DIR}"
rm -rf .next out
npm run build

# next build with output:'export' writes to ./out
BUILD_DIR="${FRONTEND_DIR}/out"

if [ ! -d "${BUILD_DIR}" ]; then
  echo "Error: build output directory '${BUILD_DIR}' not found."
  echo "Ensure next.config.mjs has output: 'export' configured."
  exit 1
fi

# -----------------------------------------------------------------------------
# Sync to S3
# -----------------------------------------------------------------------------

echo ""
echo "==> Syncing to s3://${BUCKET_NAME}..."

aws s3 sync "${BUILD_DIR}" "s3://${BUCKET_NAME}" \
  --delete \
  --region "${REGION}" \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html"

# HTML files should not be cached aggressively — browsers must re-fetch them
# to pick up new hashed asset filenames after each deploy.
aws s3 sync "${BUILD_DIR}" "s3://${BUCKET_NAME}" \
  --delete \
  --region "${REGION}" \
  --cache-control "public,max-age=0,must-revalidate" \
  --include "*.html"

echo "    Sync complete."

# -----------------------------------------------------------------------------
# Invalidate CloudFront cache
# -----------------------------------------------------------------------------

echo ""
echo "==> Invalidating CloudFront cache (distribution: ${DISTRIBUTION_ID})..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)

echo "    Invalidation ID: ${INVALIDATION_ID}"
echo "    (Propagates to all edge locations in ~1 minute)"

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------

echo ""
echo "========================================"
echo " Frontend deployed successfully"
echo " URL: ${FRONTEND_URL}"
echo "========================================"
echo ""
