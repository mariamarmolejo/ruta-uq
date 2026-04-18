#!/usr/bin/env bash
# =============================================================================
# RutaUQ — Frontend Deploy Script
#
# Builds the Next.js static export and pushes it to S3 + invalidates CloudFront.
#
# Usage:
#   export AWS_PROFILE=dev
#   ./deploy-frontend.sh dev
#
# Prerequisites:
#   - CDN stack deployed: ./deploy.sh dev cdn
#   - rutauq-frontend/.env.production must exist with correct values
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

echo "    Bucket:          ${BUCKET_NAME}"
echo "    Distribution ID: ${DISTRIBUTION_ID}"

# -----------------------------------------------------------------------------
# Build Next.js static export
# -----------------------------------------------------------------------------

echo ""
echo "==> Building Next.js static export..."
cd "${FRONTEND_DIR}"
rm -rf .next out
npm run build

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

# HTML files must not be cached aggressively so browsers re-fetch them after
# each deploy to pick up new hashed asset filenames.
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
echo " URL: https://www.rutauq.online"
echo "========================================"
echo ""
