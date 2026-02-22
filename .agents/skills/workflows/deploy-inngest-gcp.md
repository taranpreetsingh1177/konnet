---
description: Deploy Inngest to Google Cloud Run with PostgreSQL and Redis
---

# Deploy Inngest to Google Cloud Run

This workflow guides you through deploying Inngest on Google Cloud Run with PostgreSQL and Redis databases.

## Prerequisites

1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Authenticate with Google Cloud:
```bash
gcloud auth login
gcloud auth application-default login
```

3. Set your project ID:
```bash
gcloud config set project YOUR_PROJECT_ID
```

## Step 1: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable vpcaccess.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Set Environment Variables

```bash
$PROJECT_ID = gcloud config get-value project
$REGION = "us-central1"  # Change to your preferred region
$INSTANCE_NAME = "inngest-server"
$DB_INSTANCE_NAME = "inngest-postgres"
$REDIS_INSTANCE_NAME = "inngest-redis"
```

## Step 3: Create Cloud SQL PostgreSQL Instance

```bash
gcloud sql instances create $DB_INSTANCE_NAME `
  --database-version=POSTGRES_15 `
  --tier=db-f1-micro `
  --region=$REGION `
  --root-password=YOUR_SECURE_PASSWORD `
  --database-flags=max_connections=100
```

Note: For production, use a stronger tier like `db-custom-2-8192`

## Step 4: Create PostgreSQL Database

```bash
gcloud sql databases create inngest --instance=$DB_INSTANCE_NAME
```

## Step 5: Create Redis Instance

```bash
gcloud redis instances create $REDIS_INSTANCE_NAME `
  --size=1 `
  --region=$REGION `
  --redis-version=redis_7_0 `
  --tier=basic
```

Note: Basic tier is for development. Use `standard` for production with high availability.

## Step 6: Create VPC Connector (for private IP access)

```bash
gcloud compute networks vpc-access connectors create inngest-connector `
  --region=$REGION `
  --network=default `
  --range=10.8.0.0/28
```

## Step 7: Get Database Connection Details

### Get Cloud SQL Connection Name:
```bash
gcloud sql instances describe $DB_INSTANCE_NAME --format="get(connectionName)"
```

### Get Redis Host and Port:
```bash
gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="get(host)"
gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="get(port)"
```

## Step 8: Deploy Inngest to Cloud Run

```bash
gcloud run deploy $INSTANCE_NAME `
  --image=docker.io/inngest/inngest:latest `
  --region=$REGION `
  --platform=managed `
  --allow-unauthenticated `
  --port=8288 `
  --add-cloudsql-instances=${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME} `
  --vpc-connector=inngest-connector `
  --set-env-vars="INNGEST_DB_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@/inngest?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}" `
  --set-env-vars="INNGEST_REDIS_URL=redis://REDIS_HOST:REDIS_PORT" `
  --set-env-vars="INNGEST_DEV_MODE=false" `
  --set-env-vars="INNGEST_EVENT_KEY_SALT=$(openssl rand -hex 16)" `
  --set-env-vars="INNGEST_SIGNING_KEY=$(openssl rand -hex 32)" `
  --memory=512Mi `
  --cpu=1 `
  --min-instances=1 `
  --max-instances=10
```

Replace:
- `YOUR_SECURE_PASSWORD` with your actual PostgreSQL password
- `REDIS_HOST` with the Redis host from Step 7
- `REDIS_PORT` with the Redis port from Step 7 (usually 6379)

## Step 9: Get Inngest URL

```bash
gcloud run services describe $INSTANCE_NAME --region=$REGION --format="get(status.url)"
```

## Step 10: Configure Your Application

Update your application's environment variables to point to the deployed Inngest instance:

```env
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
INNGEST_BASE_URL=https://your-inngest-url-from-step-9.run.app
```

## Step 11: Test the Deployment

```bash
curl https://your-inngest-url.run.app/health
```

## Optional: Set up Custom Domain

```bash
gcloud run domain-mappings create --service=$INSTANCE_NAME --domain=inngest.yourdomain.com --region=$REGION
```

## Monitoring and Logs

View logs:
```bash
gcloud run services logs read $INSTANCE_NAME --region=$REGION --limit=50
```

View metrics in Cloud Console:
```
https://console.cloud.google.com/run/detail/${REGION}/${INSTANCE_NAME}/metrics
```

## Scaling Configuration

For production workloads, adjust:

```bash
gcloud run services update $INSTANCE_NAME `
  --region=$REGION `
  --memory=2Gi `
  --cpu=2 `
  --min-instances=2 `
  --max-instances=100 `
  --concurrency=80
```

## Cost Optimization

For development environments:
- Use `db-f1-micro` for PostgreSQL
- Use `basic` tier for Redis (size=1)
- Set `--min-instances=0` for Cloud Run

For production:
- Use at least `db-custom-2-8192` for PostgreSQL
- Use `standard` tier for Redis with high availability
- Set appropriate min-instances based on traffic

## Cleanup (if needed)

```bash
gcloud run services delete $INSTANCE_NAME --region=$REGION
gcloud redis instances delete $REDIS_INSTANCE_NAME --region=$REGION
gcloud sql instances delete $DB_INSTANCE_NAME
gcloud compute networks vpc-access connectors delete inngest-connector --region=$REGION
```

## Notes

1. **Security**: Store sensitive values like passwords and keys in Google Secret Manager
2. **Backup**: Enable automatic backups for Cloud SQL
3. **Monitoring**: Set up Cloud Monitoring alerts for database and Redis
4. **IAM**: Use service accounts with minimal permissions
5. **SSL**: Cloud SQL supports SSL connections - enable in production
