#!/usr/bin/env bash
# =============================================================================
# RutaUQ — Database Reset Script
#
# Drops and recreates the public schema on the RDS instance by running a
# temporary postgres:16-alpine ECS task (the only network path to private RDS).
# Flyway re-applies all migrations on next app startup.
#
# Usage:
#   export AWS_PROFILE=dev
#   ./reset-db.sh dev
#
# Prerequisites:
#   - ECS stack deployed and service running
#   - AWS CLI v2, jq installed
# =============================================================================

set -euo pipefail

ENVIRONMENT=${1:-dev}

PROJECT="rutauq"
REGION="us-east-1"

ECS_STACK="${PROJECT}-${ENVIRONMENT}-ecs"
RDS_STACK="${PROJECT}-${ENVIRONMENT}-rds"
CLUSTER="${PROJECT}-${ENVIRONMENT}"
SERVICE="${PROJECT}-${ENVIRONMENT}-backend"

echo ""
echo "========================================"
echo " RutaUQ DB Reset — environment: ${ENVIRONMENT}"
echo "========================================"
echo ""
echo "WARNING: This will erase ALL data in the ${ENVIRONMENT} database."
echo "         Flyway will re-apply all migrations on next deploy."
echo ""
read -r -p "Type 'yes' to continue: " CONFIRM
[[ "${CONFIRM}" == "yes" ]] || { echo "Aborted."; exit 0; }

# -----------------------------------------------------------------------------
# Fetch required values from CloudFormation stacks and SSM
# -----------------------------------------------------------------------------

echo ""
echo "==> Fetching configuration..."

EXECUTION_ROLE=$(aws cloudformation describe-stacks \
  --stack-name "${ECS_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ExecutionRoleArn'].OutputValue" \
  --output text)

DB_HOST=$(aws cloudformation describe-stacks \
  --stack-name "${RDS_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='DbEndpoint'].OutputValue" \
  --output text)

DB_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${RDS_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='DbName'].OutputValue" \
  --output text)

DB_PORT=$(aws cloudformation describe-stacks \
  --stack-name "${RDS_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='DbPort'].OutputValue" \
  --output text)

DB_USER=$(jq -r '.[] | select(.ParameterKey=="DbUsername") | .ParameterValue' \
  "$(dirname "$0")/parameters/${ENVIRONMENT}/ecs.json")

DB_PASS_PATH=$(jq -r '.[] | select(.ParameterKey=="DbPasswordSsmPath") | .ParameterValue' \
  "$(dirname "$0")/parameters/${ENVIRONMENT}/ecs.json")

DB_PASS=$(aws ssm get-parameter \
  --name "${DB_PASS_PATH}" --with-decryption \
  --region "${REGION}" \
  --query "Parameter.Value" --output text)

LOG_GROUP=$(aws cloudformation describe-stacks \
  --stack-name "${ECS_STACK}" --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='LogGroupName'].OutputValue" \
  --output text)

# Network config from the running service
SERVICE_DESC=$(aws ecs describe-services \
  --cluster "${CLUSTER}" --services "${SERVICE}" \
  --region "${REGION}" --query "services[0]")

SUBNETS=$(echo "${SERVICE_DESC}" | jq -r '.networkConfiguration.awsvpcConfiguration.subnets | join(",")')
SECURITY_GROUPS=$(echo "${SERVICE_DESC}" | jq -r '.networkConfiguration.awsvpcConfiguration.securityGroups | join(",")')
ASSIGN_PUBLIC_IP=$(echo "${SERVICE_DESC}" | jq -r '.networkConfiguration.awsvpcConfiguration.assignPublicIp')

echo "    DB host:         ${DB_HOST}"
echo "    DB name:         ${DB_NAME}"
echo "    DB user:         ${DB_USER}"
echo "    Subnets:         ${SUBNETS}"
echo "    Security groups: ${SECURITY_GROUPS}"

# -----------------------------------------------------------------------------
# Register a temporary task definition using postgres:16-alpine
# -----------------------------------------------------------------------------

echo ""
echo "==> Registering temporary task definition..."

TASK_DEF_JSON=$(jq -n \
  --arg family    "${PROJECT}-${ENVIRONMENT}-db-reset" \
  --arg exec_role "${EXECUTION_ROLE}" \
  --arg log_group "${LOG_GROUP}" \
  --arg region    "${REGION}" \
  --arg db_host   "${DB_HOST}" \
  --arg db_port   "${DB_PORT}" \
  --arg db_name   "${DB_NAME}" \
  --arg db_user   "${DB_USER}" \
  --arg db_pass   "${DB_PASS}" \
  '{
    family: $family,
    executionRoleArn: $exec_role,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "256",
    memory: "512",
    containerDefinitions: [{
      name: "db-reset",
      image: "postgres:16-alpine",
      essential: true,
      environment: [
        { name: "PGHOST",     value: $db_host },
        { name: "PGPORT",     value: $db_port },
        { name: "PGDATABASE", value: $db_name },
        { name: "PGUSER",     value: $db_user },
        { name: "PGPASSWORD", value: $db_pass }
      ],
      command: [
        "psql",
        "--command", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group":         $log_group,
          "awslogs-region":        $region,
          "awslogs-stream-prefix": "db-reset"
        }
      }
    }]
  }')

TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json "${TASK_DEF_JSON}" \
  --region "${REGION}" \
  --query  "taskDefinition.taskDefinitionArn" \
  --output text)

echo "    Task definition: ${TASK_DEF_ARN}"

# -----------------------------------------------------------------------------
# Run the task and wait
# -----------------------------------------------------------------------------

echo ""
echo "==> Running reset task..."

TASK_ARN=$(aws ecs run-task \
  --cluster         "${CLUSTER}" \
  --task-definition "${TASK_DEF_ARN}" \
  --launch-type     FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=${ASSIGN_PUBLIC_IP}}" \
  --region          "${REGION}" \
  --query           "tasks[0].taskArn" \
  --output          text)

echo "    Task ARN: ${TASK_ARN}"
echo ""
echo "==> Waiting for task to complete (~1 min)..."

aws ecs wait tasks-stopped \
  --cluster "${CLUSTER}" \
  --tasks   "${TASK_ARN}" \
  --region  "${REGION}"

EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "${CLUSTER}" \
  --tasks   "${TASK_ARN}" \
  --region  "${REGION}" \
  --query   "tasks[0].containers[0].exitCode" \
  --output  text)

# -----------------------------------------------------------------------------
# Deregister the temporary task definition
# -----------------------------------------------------------------------------

echo ""
echo "==> Deregistering temporary task definition..."
aws ecs deregister-task-definition \
  --task-definition "${TASK_DEF_ARN}" \
  --region "${REGION}" \
  --query  "taskDefinition.status" \
  --output text

# -----------------------------------------------------------------------------
# Result
# -----------------------------------------------------------------------------

echo ""
if [[ "${EXIT_CODE}" == "0" ]]; then
  echo "========================================"
  echo " Database reset complete."
  echo " Run './deploy.sh ${ENVIRONMENT} push' to redeploy"
  echo " the app — Flyway will recreate the schema."
  echo "========================================"
else
  echo "ERROR: Reset task exited with code ${EXIT_CODE}."
  echo "Check logs in CloudWatch:"
  echo "  Log group:  ${LOG_GROUP}"
  echo "  Log stream: db-reset/db-reset/<task-id>"
  exit 1
fi
echo ""
