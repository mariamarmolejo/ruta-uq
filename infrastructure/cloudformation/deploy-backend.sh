#!/usr/bin/env bash
# =============================================================================
# RutaUQ — Backend Deploy Script (push)
#
# Builds the backend JAR, packages a Docker image, pushes to ECR, and forces
# a new ECS deployment.
#
# Usage:
#   export AWS_PROFILE=dev
#   ./deploy-backend.sh dev
#
# Prerequisites:
#   - ECR stack deployed: ./deploy.sh dev ecr
#   - ECS stack deployed: ./deploy.sh dev ecs
#   - Java 21, Maven, Docker (buildx) installed
# =============================================================================

set -euo pipefail

ENVIRONMENT=${1:-dev}

PROJECT="rutauq"
REGION="us-east-1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../../rutaUQ-backend"

ECR_STACK="${PROJECT}-${ENVIRONMENT}-ecr"
ECS_CLUSTER="${PROJECT}-${ENVIRONMENT}"
ECS_SERVICE="${PROJECT}-${ENVIRONMENT}-backend"

# -----------------------------------------------------------------------------
# 1. Resolve ECR repository URI from the ECR stack outputs
# -----------------------------------------------------------------------------

echo ""
echo "==> Fetching ECR repository URI from stack: ${ECR_STACK}"

REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name "${ECR_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='BackendRepositoryUri'].OutputValue" \
  --output text)

if [[ -z "${REPO_URI}" || "${REPO_URI}" == "None" ]]; then
  echo "ERROR: Could not resolve BackendRepositoryUri from stack '${ECR_STACK}'."
  echo "Make sure the ECR stack is deployed: ./deploy.sh ${ENVIRONMENT} ecr"
  exit 1
fi

echo "    ECR repo: ${REPO_URI}"

# -----------------------------------------------------------------------------
# 2. Build the fat JAR
# -----------------------------------------------------------------------------

echo ""
echo "==> Building JAR (mvn package -DskipTests)..."

cd "${BACKEND_DIR}"
mvn package -DskipTests -q

# -----------------------------------------------------------------------------
# 3. Build Docker image tagged as latest
# -----------------------------------------------------------------------------

echo ""
echo "==> Building Docker image..."

docker buildx build --platform linux/amd64 --no-cache -t "${REPO_URI}:latest" --load "${BACKEND_DIR}"

# -----------------------------------------------------------------------------
# 4. Authenticate Docker to ECR
# -----------------------------------------------------------------------------

echo ""
echo "==> Logging in to ECR..."

aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REPO_URI%%/*}"

# -----------------------------------------------------------------------------
# 5. Push the image
# -----------------------------------------------------------------------------

echo ""
echo "==> Pushing image to ECR..."

docker push "${REPO_URI}:latest"

echo "    Pushed: ${REPO_URI}:latest"

# -----------------------------------------------------------------------------
# 6. Force a new ECS deployment (only if ECS service exists)
# -----------------------------------------------------------------------------

echo ""
ECS_SERVICE_COUNT=$(aws ecs describe-services \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${REGION}" \
  --query "length(services)" \
  --output text 2>/dev/null || echo "0")

if [[ "${ECS_SERVICE_COUNT}" -gt 0 ]]; then
  echo "==> Forcing new ECS deployment (cluster=${ECS_CLUSTER}, service=${ECS_SERVICE})..."
  aws ecs update-service \
    --cluster  "${ECS_CLUSTER}" \
    --service  "${ECS_SERVICE}" \
    --force-new-deployment \
    --region   "${REGION}" \
    --query    "service.deployments[0].status" \
    --output   text
  echo "    Deployment triggered."
else
  echo "==> ECS service not found (cluster=${ECS_CLUSTER}, service=${ECS_SERVICE}); skipping force-new-deployment."
  echo "    Deploy ECS stack first: ./deploy.sh ${ENVIRONMENT} ecs"
fi

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------

echo ""
echo "========================================"
echo " Backend deploy (push) complete"
echo "========================================"
echo ""
