# RutaUQ — AWS Infrastructure

CloudFormation-based infrastructure for the RutaUQ carpooling platform.

## Stack dependency order

```
certificate → networking → ecr → rds → ecs → cdn
```

## Custom domain: rutauq.online

| Subdomain | Routes to |
|-----------|-----------|
| `www.rutauq.online` | CloudFront → S3 (Next.js static export) |
| `api.rutauq.online` | ALB → ECS (Spring Boot backend) |
| `rutauq.online` (apex) | CloudFront → S3 redirect bucket → 301 to `https://www.rutauq.online` |

---

## First-time deployment with custom domain

### Step 1 — Deploy the certificate stack

```bash
export AWS_PROFILE=dev
./deploy.sh dev certificate
```

This requests an ACM certificate covering `rutauq.online`, `www.rutauq.online`, and
`api.rutauq.online` using DNS validation. The stack reaches `CREATE_IN_PROGRESS` and
waits for validation.

### Step 2 — Add ACM validation CNAME records at the registrar

1. Open the [ACM console](https://console.aws.amazon.com/acm/home?region=us-east-1) in **us-east-1**.
2. Find the certificate for `rutauq.online`.
3. Note the three `CNAME` records shown under **Domains** (one per domain name covered).
4. Add all three records to the registrar DNS panel (exact names/values are shown in the console).
5. Wait **10–30 minutes** for the certificate status to change to **ISSUED**.

> The CloudFormation deploy command blocks until the certificate is validated (or times out
> after 3 hours). Once the DNS records propagate, ACM validates and the stack completes.

### Step 3 — Copy the CertificateArn into parameters files

After `./deploy.sh dev certificate` completes, copy the `CertificateArn` output value into:

- `parameters/dev/cdn.json` → `AcmCertificateArn`
- `parameters/dev/ecs.json` → `AcmCertificateArn`

Replace the placeholder value `REPLACE_WITH_CERT_ARN_AFTER_VALIDATION`.

### Step 4 — Deploy networking (ALB HTTPS listener)

```bash
./deploy.sh dev networking
```

Updates the ALB with:
- **Port 443** HTTPS listener (uses the ACM cert)
- **Port 80** HTTP listener that issues a 301 redirect to HTTPS

### Step 5 — Deploy CDN (CloudFront aliases + apex redirect)

```bash
./deploy.sh dev cdn
```

Creates / updates:
- Main CloudFront distribution with `Aliases: [www.rutauq.online, rutauq.online]`
- Apex-redirect S3 bucket (`rutauq.online`) that 301-redirects to `https://www.rutauq.online`
- Apex CloudFront distribution fronting that redirect bucket (so HTTPS works for the apex)

After this step the script prints the exact DNS records to add.

### Step 6 — Add DNS records at the registrar

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `www` | `<CloudFront frontend domain>` (printed by deploy script) |
| `CNAME` | `api` | `<ALB DNS name>` (printed by deploy script) |
| `ALIAS` / `ANAME` | `@` (apex) | `<CloudFront apex-redirect domain>` (printed by deploy script) |
| `CNAME` | `_acm-validation-*` × 3 | ACM-generated values from Step 2 |

**Apex record note:** If your registrar supports `ALIAS` or `ANAME` record types, use them
for the `@` record — they resolve correctly at the zone apex. If the registrar only supports
`CNAME`, use a CNAME pointing to the apex CloudFront domain. The apex CloudFront distribution
(fronting the S3 redirect bucket) handles the `rutauq.online → https://www.rutauq.online`
redirect entirely server-side, so the CNAME → CloudFront approach works even for registrars
that don't support ALIAS records.

### Step 7 — Redeploy backend with custom domain

```bash
./deploy.sh dev ecs    # sets APP_BASE_URL=https://api.rutauq.online via BackendUrl parameter
./deploy.sh dev push   # forces new ECS task with updated APP_BASE_URL
```

### Step 8 — Redeploy frontend with custom domain

```bash
./deploy.sh dev push-frontend
# Writes NEXT_PUBLIC_API_URL=https://api.rutauq.online/api/v1 → builds → S3 sync
```

### Step 9 — Smoke test

```bash
# Frontend loads
curl -I https://www.rutauq.online

# Apex redirects to www
curl -I https://rutauq.online
# Expect: HTTP/2 301  Location: https://www.rutauq.online/

# API health check
curl https://api.rutauq.online/api/v1/health
# Expect: {"success":true,"data":{"status":"UP"}}
```

After the domain is live, update the MercadoPago webhook URL in the
[Mercado Pago developer dashboard](https://www.mercadopago.com.ar/developers/panel/app)
to `https://api.rutauq.online/api/v1/payments/webhook`.

---

## SSM Parameter Store

Secrets are stored in SSM as `SecureString` and injected into the ECS task at startup.

```bash
# Required before deploying rds or ecs
aws ssm put-parameter --name /rutauq/dev/db-password      --value "..." --type SecureString
aws ssm put-parameter --name /rutauq/dev/jwt-secret        --value "..." --type SecureString
aws ssm put-parameter --name /rutauq/dev/mp-access-token   --value "..." --type SecureString
aws ssm put-parameter --name /rutauq/dev/mp-webhook-secret --value "..." --type SecureString
aws ssm put-parameter --name /rutauq/dev/google-client-id  --value "..." --type SecureString

# Only when MailEnabled=true in ecs.json
aws ssm put-parameter --name /rutauq/dev/mail-password     --value "..." --type SecureString

# Domain values (informational — not read by ECS directly, BackendUrl param handles this)
aws ssm put-parameter --name /rutauq/prod/domain/frontend  --value "https://www.rutauq.online" --type String
aws ssm put-parameter --name /rutauq/prod/domain/api       --value "https://api.rutauq.online" --type String
```

---

## Subsequent deploys (after initial custom domain setup)

```bash
# Backend code change
./deploy.sh dev push

# Frontend code change
./deploy.sh dev push-frontend

# Infrastructure change
./deploy.sh dev <stack-name>
```
