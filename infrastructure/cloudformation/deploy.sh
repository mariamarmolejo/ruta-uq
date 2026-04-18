#!/usr/bin/env bash
# =============================================================================
# RutaUQ — CloudFormation Deploy Script
#
# Usage:
#   export AWS_PROFILE=dev
#
#   ./deploy.sh dev certificate  # request ACM cert for rutauq.online (DNS validation)
#   ./deploy.sh dev networking   # deploy/update networking stack
#   ./deploy.sh dev ecr          # deploy/update ECR stack
#   ./deploy.sh dev rds          # deploy/update RDS stack
#   ./deploy.sh dev ecs          # deploy/update ECS + ALB stack
#   ./deploy.sh dev push         # build JAR + Docker image, push to ECR, force ECS deploy
#   ./deploy.sh dev push-frontend # build Next.js, sync to S3, invalidate CloudFront
#   ./deploy.sh dev cdn          # deploy/update S3 + CloudFront stack
#   ./deploy.sh dev all          # certificate → networking → ecr → rds → ecs → cdn
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
# print_dns_instructions
#   After cdn is deployed, print the exact DNS records to configure at the
#   registrar so the operator knows what to do next.
# -----------------------------------------------------------------------------

print_dns_instructions() {
  local cdn_stack="${PROJECT}-${ENVIRONMENT}-cdn"
  local ecs_stack="${PROJECT}-${ENVIRONMENT}-ecs"

  CF_DOMAIN=$(aws cloudformation describe-stacks --stack-name "${cdn_stack}" --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text 2>/dev/null || echo "<cdn-not-deployed>")
  APEX_CF_DOMAIN=$(aws cloudformation describe-stacks --stack-name "${cdn_stack}" --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='ApexCloudfrontDomain'].OutputValue" --output text 2>/dev/null || echo "<apex-cdn-not-deployed>")
  ALB_DNS=$(aws cloudformation describe-stacks --stack-name "${ecs_stack}" --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" --output text 2>/dev/null || echo "<ecs-not-deployed>")

  echo ""
  echo "========================================"
  echo " DNS records to add at your registrar"
  echo "========================================"
  printf "  %-8s  %-20s  %s\n" "Type" "Name" "Value"
  printf "  %-8s  %-20s  %s\n" "----" "----" "-----"
  printf "  %-8s  %-20s  %s\n" "CNAME"  "www"    "${CF_DOMAIN}"
  printf "  %-8s  %-20s  %s\n" "CNAME"  "api"    "${ALB_DNS}"
  printf "  %-8s  %-20s  %s\n" "ALIAS"  "@"      "${APEX_CF_DOMAIN}"
  echo ""
  echo " NOTE: Use ALIAS/ANAME for @ if your registrar supports it."
  echo "       If not, CNAME @ to the apex CloudFront domain above."
  echo " NOTE: Also add the 3 ACM CNAME validation records shown in the"
  echo "       ACM console before the certificate status reaches ISSUED."
  echo "========================================"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

case "${STACK}" in

  certificate)
    deploy_stack certificate
    show_outputs certificate

    # Read the ARN from the stack output and patch both parameter files in place.
    CERT_ARN=$(aws cloudformation describe-stacks \
      --stack-name "${PROJECT}-${ENVIRONMENT}-certificate" \
      --region     "${REGION}" \
      --query      "Stacks[0].Outputs[?OutputKey=='CertificateArn'].OutputValue" \
      --output     text)

    if [[ -z "${CERT_ARN}" || "${CERT_ARN}" == "None" ]]; then
      echo ""
      echo "WARNING: Could not read CertificateArn from stack output."
      echo "  Copy it manually into:"
      echo "    ${PARAMS_DIR}/cdn.json  → AcmCertificateArn"
      echo "    ${PARAMS_DIR}/ecs.json  → AcmCertificateArn"
    else
      for params_file in "${PARAMS_DIR}/cdn.json" "${PARAMS_DIR}/ecs.json"; do
        tmp=$(mktemp)
        jq --arg arn "${CERT_ARN}" \
          'map(if .ParameterKey == "AcmCertificateArn" then .ParameterValue = $arn else . end)' \
          "${params_file}" > "${tmp}" && mv "${tmp}" "${params_file}"
      done
      echo ""
      echo " AcmCertificateArn written to cdn.json and ecs.json: ${CERT_ARN}"
    fi

    echo ""
    echo "========================================"
    echo " NEXT STEP: DNS validation"
    echo "========================================"
    echo " 1. Open the ACM console in us-east-1"
    echo " 2. Find the certificate for rutauq.online"
    echo " 3. Note the 3 CNAME validation records"
    echo " 4. Add them at your registrar DNS panel"
    echo " 5. Wait ~10–30 min for status = ISSUED"
    echo " 6. Then run:  $0 ${ENVIRONMENT} networking"
    echo "               $0 ${ENVIRONMENT} cdn"
    echo "========================================"
    ;;

  networking)
    deploy_stack networking
    show_outputs networking
    ;;

  ecr)
    deploy_stack ecr
    show_outputs ecr
    echo ""
    echo "========================================"
    echo " Building and pushing backend image (deploy-backend.sh)"
    echo " Maven + Docker build + docker push logs follow below."
    echo "========================================"
    "${SCRIPT_DIR}/deploy-backend.sh" "${ENVIRONMENT}"
    ;;
  push)
    # Build JAR + Docker image, push to ECR, force ECS deploy (see deploy-backend.sh)
    "${SCRIPT_DIR}/deploy-backend.sh" "${ENVIRONMENT}"
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

    deploy_stack ecs
    show_outputs ecs
    ;;

  cdn)
    deploy_stack cdn
    show_outputs cdn
    print_dns_instructions
    "${SCRIPT_DIR}/deploy-frontend.sh" "${ENVIRONMENT}"
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
    # Dependency order: certificate → networking → ecr → rds → ecs → cdn
    # Then re-deploy ECS to inject FrontendUrl + BackendUrl from CDN.
    deploy_stack certificate
    deploy_stack networking
    deploy_stack ecr
    echo ""
    echo "========================================"
    echo " Building and pushing backend image (deploy-backend.sh)"
    echo "========================================"
    "${SCRIPT_DIR}/deploy-backend.sh" "${ENVIRONMENT}"
    deploy_stack rds
    deploy_stack ecs
    deploy_stack cdn
    print_dns_instructions
    echo ""
    echo "========================================"
    echo " Building and pushing frontend (deploy-frontend.sh)"
    echo "========================================"
    "${SCRIPT_DIR}/deploy-frontend.sh" "${ENVIRONMENT}"
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
    echo "Usage: $0 <environment> <certificate|networking|ecr|rds|ecs|push|cdn|push-frontend|all>"
    echo "Example: $0 dev all"
    exit 1
    ;;

esac

echo ""
echo "Done."
