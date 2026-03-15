#!/usr/bin/env bash
# =============================================================================
# bootstrap-state.sh
#
# Creates the S3 bucket and DynamoDB table that Terraform uses for remote
# state storage and locking.
#
# Run this ONCE before any `terraform init` — it is not managed by Terraform
# itself (bootstrapping problem: you need state before you can track state).
#
# Usage:
#   chmod +x bootstrap-state.sh
#   ./bootstrap-state.sh [environment]
#
# Examples:
#   ./bootstrap-state.sh dev
#   ./bootstrap-state.sh prod
# =============================================================================

set -euo pipefail

# ---- Configuration -----------------------------------------------------------
ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

STATE_BUCKET="rutauq-terraform-state-${AWS_ACCOUNT_ID}-${ENVIRONMENT}"
LOCK_TABLE="rutauq-terraform-locks-${ENVIRONMENT}"

echo ""
echo "========================================"
echo "  Bootstrapping Terraform remote state"
echo "  Environment : ${ENVIRONMENT}"
echo "  Region      : ${AWS_REGION}"
echo "  Account     : ${AWS_ACCOUNT_ID}"
echo "  S3 Bucket   : ${STATE_BUCKET}"
echo "  DynamoDB    : ${LOCK_TABLE}"
echo "========================================"
echo ""

# ---- S3 Bucket ---------------------------------------------------------------
echo "▶ Creating S3 state bucket..."

if aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
  echo "  ✓ Bucket already exists, skipping creation."
else
  aws s3api create-bucket \
    --bucket "${STATE_BUCKET}" \
    --region "${AWS_REGION}" \
    $([ "${AWS_REGION}" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=${AWS_REGION}" || echo "")

  echo "  ✓ Bucket created."
fi

echo "▶ Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled
echo "  ✓ Versioning enabled."

echo "▶ Enabling AES-256 encryption..."
aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
echo "  ✓ Encryption enabled."

echo "▶ Blocking all public access..."
aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "  ✓ Public access blocked."

# ---- DynamoDB Table ----------------------------------------------------------
echo "▶ Creating DynamoDB lock table..."

if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" 2>/dev/null; then
  echo "  ✓ Table already exists, skipping creation."
else
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${AWS_REGION}"

  echo "  Waiting for table to become active..."
  aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${AWS_REGION}"
  echo "  ✓ DynamoDB table created."
fi

# ---- Output ------------------------------------------------------------------
echo ""
echo "========================================"
echo "  Bootstrap complete!"
echo ""
echo "  Update environments/${ENVIRONMENT}/backend.tf with:"
echo "    bucket         = \"${STATE_BUCKET}\""
echo "    dynamodb_table = \"${LOCK_TABLE}\""
echo "    region         = \"${AWS_REGION}\""
echo "========================================"
echo ""
