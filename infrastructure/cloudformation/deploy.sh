#!/usr/bin/env bash
# =============================================================================
# RutaUQ — CloudFormation Deploy Script
#
# Usage:
#   export AWS_PROFILE=dev
#
#   ./deploy.sh dev networking   # deploy/update networking stack
#   ./deploy.sh dev ecr          # deploy/update ECR stack
#   ./deploy.sh dev rds          # deploy/update RDS stack
#   ./deploy.sh dev ecs          # deploy/update ECS + ALB stack
#   ./deploy.sh dev push         # build JAR + Docker image, push to ECR, force ECS deploy
#   ./deploy.sh dev push-frontend # build Next.js, sync to S3, invalidate CloudFront
#   ./deploy.sh dev cdn          # deploy/update S3 + CloudFront stack
#   ./deploy.sh dev all          # deploy all stacks in dependency order
#
# Prerequisites:
#   - AWS CLI v2 installed and profile configured
#   - jq installed (brew install jq)
#   - SSM parameters must exist before deploying rds or ecs:
#       aws ssm put-parameter --name /rutauq/dev/db-password      --value "..." --type SecureString
#       aws ssm put-parameter --name /rutauq/dev/jwt-secret        --value "..." --type SecureString
#       aws ssm put-parameter --name /rutauq/dev/mp-access-token   --value "..." --type SecureString
#       aws ssm put-parameter --name /rutauq/dev/mp-webhook-secret --value "..." --type SecureString
#       aws ssm put-parameter --name /rutauq/dev/google-client-id  --value "..." --type SecureString
#   - (Only when MailEnabled=true in ecs.json) SMTP password:
#       aws ssm put-parameter --name /rutauq/dev/mail-password     --value "..." --type SecureString
# =============================================================================

set -euo pipefail
export AWS_PROFILE=dev
ENVIRONMENT=${1:-dev}
STACK=${2:-all}

PROJECT="rutauq"
REGION="us-east-1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"
PARAMS_DIR="${SCRIPT_DIR}/parameters/${ENVIRONMENT}"

# -----------------------------------------------------------------------------
# deploy_stack <name> [extra_param_overrides]
#   Creates the stack if it doesn't exist, updates it if it does.
#   Uses jq to convert the parameters JSON into key=value pairs for `deploy`.
#   Optional extra_param_overrides: space-separated Key=Value pairs (override file values).
# -----------------------------------------------------------------------------

deploy_stack() {
  local name="$1"
  local extra_overrides="${2:-}"
  local stack_name="${PROJECT}-${ENVIRONMENT}-${name}"
  local template="${TEMPLATES_DIR}/${name}.yml"
  local params_file="${PARAMS_DIR}/${name}.json"

  echo ""
  echo "========================================"
  echo " Deploying: ${stack_name}"
  echo "========================================"

  # Convert [{"ParameterKey":"K","ParameterValue":"V"},...] → K=V K=V ...
  local param_overrides
  param_overrides=$(jq -r '.[] | "\(.ParameterKey)=\(.ParameterValue)"' "${params_file}" | tr '\n' ' ')
  # Append extra overrides so they take precedence
  [[ -n "${extra_overrides}" ]] && param_overrides="${param_overrides} ${extra_overrides}"

  aws cloudformation deploy \
    --stack-name        "${stack_name}" \
    --template-file     "${template}" \
    --parameter-overrides ${param_overrides} \
    --capabilities      CAPABILITY_NAMED_IAM \
    --region            "${REGION}" \
    --no-fail-on-empty-changeset

  echo " Done: ${stack_name}"
}

# -----------------------------------------------------------------------------
# show_outputs <name>
#   Prints the stack outputs after deployment — handy for copy-pasting values.
# -----------------------------------------------------------------------------

show_outputs() {
  local name="$1"
  local stack_name="${PROJECT}-${ENVIRONMENT}-${name}"

  echo ""
  echo "--- Outputs: ${stack_name} ---"
  aws cloudformation describe-stacks \
    --stack-name "${stack_name}" \
    --region     "${REGION}" \
    --query      "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
    --output     table
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

case "${STACK}" in

  networking)
    deploy_stack networking
    show_outputs networking
    ;;

  ecr)
    deploy_stack ecr
    show_outputs ecr
    ;;
  push)
      # Build the backend JAR, package a Docker image, push to ECR, and force a new ECS deployment.
      BACKEND_DIR="${SCRIPT_DIR}/../../rutaUQ-backend"

      # 1. Resolve ECR repository URI from the ECR stack outputs
      ECR_STACK="${PROJECT}-${ENVIRONMENT}-ecr"
      echo "Fetching ECR repository URI from stack: ${ECR_STACK}"
      REPO_URI=$(aws cloudformation describe-stacks \
        --stack-name "${ECR_STACK}" --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='BackendRepositoryUri'].OutputValue" \
        --output text)
      if [[ -z "${REPO_URI}" || "${REPO_URI}" == "None" ]]; then
        echo "ERROR: Could not resolve BackendRepositoryUri from stack '${ECR_STACK}'."
        echo "Make sure the ECR stack is deployed: $0 ${ENVIRONMENT} ecr"
        exit 1
      fi
      echo "ECR repo: ${REPO_URI}"

      # 2. Build the fat JAR
      echo ""
      echo "Building JAR (mvn package -DskipTests)..."
      (export AWS_PROFILE=dev && cd "${BACKEND_DIR}"  && mvn package -DskipTests -q)

      # 3. Build Docker image tagged as latest
      echo ""
      echo "Building Docker image..."
      docker buildx build --platform linux/amd64 --no-cache -t "${REPO_URI}:latest" --load "${BACKEND_DIR}"

      # 4. Authenticate Docker to ECR
      echo ""
      echo "Logging in to ECR..."
      aws ecr get-login-password --region "${REGION}" \
        | docker login --username AWS --password-stdin "${REPO_URI%%/*}"

      # 5. Push the image
      echo ""
      echo "Pushing image..."
      docker push "${REPO_URI}:latest"
      echo "Pushed: ${REPO_URI}:latest"

      # 6. Force a new ECS deployment so the service pulls the new image
      ECS_CLUSTER="${PROJECT}-${ENVIRONMENT}"
      ECS_SERVICE="${PROJECT}-${ENVIRONMENT}-backend"
      echo ""
      echo "Forcing new ECS deployment (cluster=${ECS_CLUSTER}, service=${ECS_SERVICE})..."
      aws ecs update-service \
        --cluster  "${ECS_CLUSTER}" \
        --service  "${ECS_SERVICE}" \
        --force-new-deployment \
        --region   "${REGION}" \
        --query    "service.deployments[0].status" \
        --output   text
      echo "Deployment triggered."
      ;;

  rds)
    deploy_stack rds
    show_outputs rds
    ;;

  ecs)
    # If MailEnabled=true, verify the mail-password SSM parameter exists before deploying.
    MAIL_ENABLED_VALUE=$(jq -r '.[] | select(.ParameterKey=="MailEnabled") | .ParameterValue' "${PARAMS_DIR}/ecs.json")
    MAIL_SSM_PATH=$(jq -r '.[] | select(.ParameterKey=="MailPasswordSsmPath") | .ParameterValue' "${PARAMS_DIR}/ecs.json")
    if [[ "${MAIL_ENABLED_VALUE}" == "true" ]]; then
      echo ""
      echo "MailEnabled=true — checking SSM parameter: ${MAIL_SSM_PATH}"
      if ! aws ssm get-parameter --name "${MAIL_SSM_PATH}" --region "${REGION}" --query "Parameter.Name" --output text &>/dev/null; then
        echo ""
        echo "ERROR: SSM parameter '${MAIL_SSM_PATH}' not found."
        echo "Create it before deploying:"
        echo "  aws ssm put-parameter --name ${MAIL_SSM_PATH} --value \"YOUR_SMTP_PASSWORD\" --type SecureString"
        exit 1
      fi
      echo " SSM parameter found."
    fi

    # When CDN stack exists, inject FrontendUrl and BackendUrl from CDN outputs
    # so ECS CORS and webhook URL stay in sync without editing ecs.json.
    CDN_STACK="${PROJECT}-${ENVIRONMENT}-cdn"
    EXTRA_ECS_PARAMS=""
    if aws cloudformation describe-stacks --stack-name "${CDN_STACK}" --region "${REGION}" --query "Stacks[0].StackId" --output text 2>/dev/null; then
      FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "${CDN_STACK}" --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text 2>/dev/null || true)
      API_HTTPS_URL=$(aws cloudformation describe-stacks --stack-name "${CDN_STACK}" --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiHttpsUrl'].OutputValue" --output text 2>/dev/null || true)
      [[ -n "${FRONTEND_URL}" && "${FRONTEND_URL}" != "None" ]] && EXTRA_ECS_PARAMS="FrontendUrl=${FRONTEND_URL}"
      if [[ -n "${API_HTTPS_URL}" && "${API_HTTPS_URL}" != "None" ]]; then
        BACKEND_URL="${API_HTTPS_URL%/api/v1}"
        EXTRA_ECS_PARAMS="${EXTRA_ECS_PARAMS} BackendUrl=${BACKEND_URL}"
      fi
      [[ -n "${EXTRA_ECS_PARAMS}" ]] && echo " Injecting from CDN: FrontendUrl, BackendUrl"
    fi
    deploy_stack ecs "${EXTRA_ECS_PARAMS}"
    show_outputs ecs
    ;;

  cdn)
    deploy_stack cdn
    show_outputs cdn
    ;;
  push-frontend)
      # Delegates entirely to deploy-frontend.sh which:
      #   1. Reads ApiUrl from the ECS stack and writes .env.production
      #   2. Builds the Next.js static export (npm run build)
      #   3. Syncs the ./out directory to S3
      #   4. Invalidates the CloudFront distribution
      "${SCRIPT_DIR}/deploy-frontend.sh" "${ENVIRONMENT}"
      ;;
  all)
    # Dependency order: networking → ecr → rds → ecs → cdn
    # Then re-deploy ECS so it picks up FrontendUrl and BackendUrl from CDN.
    deploy_stack networking
    deploy_stack ecr
    deploy_stack rds
    deploy_stack ecs
    deploy_stack cdn
    # Inject CDN outputs into ECS (CORS + webhook URL)
    CDN_STACK="${PROJECT}-${ENVIRONMENT}-cdn"
    EXTRA_ECS_PARAMS=""
    FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "${CDN_STACK}" --region "${REGION}" \
      --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text 2>/dev/null || true)
    API_HTTPS_URL=$(aws cloudformation describe-stacks --stack-name "${CDN_STACK}" --region "${REGION}" \
      --query "Stacks[0].Outputs[?OutputKey=='ApiHttpsUrl'].OutputValue" --output text 2>/dev/null || true)
    [[ -n "${FRONTEND_URL}" && "${FRONTEND_URL}" != "None" ]] && EXTRA_ECS_PARAMS="FrontendUrl=${FRONTEND_URL}"
    if [[ -n "${API_HTTPS_URL}" && "${API_HTTPS_URL}" != "None" ]]; then
      BACKEND_URL="${API_HTTPS_URL%/api/v1}"
      EXTRA_ECS_PARAMS="${EXTRA_ECS_PARAMS} BackendUrl=${BACKEND_URL}"
    fi
    [[ -n "${EXTRA_ECS_PARAMS}" ]] && deploy_stack ecs "${EXTRA_ECS_PARAMS}"
    echo ""
    echo "========================================"
    echo " All stacks deployed successfully"
    echo "========================================"
    show_outputs networking
    show_outputs ecr
    show_outputs rds
    show_outputs ecs
    show_outputs cdn
    ;;

  *)
    echo "Error: unknown stack '${STACK}'"
    echo ""
    echo "Usage: $0 <environment> <networking|ecr|rds|ecs|push|cdn|push-frontend|all>"
    echo "Example: $0 dev all"
    exit 1
    ;;

esac

echo ""
echo "Done."
