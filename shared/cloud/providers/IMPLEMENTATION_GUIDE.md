# Cloud Provider Implementation Guide

This guide provides detailed implementation instructions for completing the remaining cloud provider integrations.

## Status Overview

### ✅ Fully Implemented Providers

1. **Vercel Provider** (Complete)
   - SDK: `@vercel/client`
   - All 8 methods fully functional
   - Production ready

2. **Netlify Provider** (Complete)
   - SDK: `@netlify/api` v14.0.5
   - All 8 methods fully functional
   - Production ready

3. **Render Provider** (Complete)
   - Custom REST API client
   - All 8 methods fully functional
   - Production ready

### ⚠️ Pending Implementation

4. **Railway Provider** (Not implemented)
5. **AWS Provider** (Not implemented)

---

## Railway Provider Implementation

### Current Status
- All methods return mock/simulated data
- No real API integration

### Requirements

#### 1. GraphQL Client Setup
Railway uses GraphQL API, requiring a GraphQL client library:

```bash
npm install graphql graphql-request
```

#### 2. API Configuration
- **Endpoint:** `https://backboard.railway.app/graphql/v2`
- **Authentication:** Bearer token or Project-Access-Token
- **Rate Limits:**
  - Free: 100 requests/hour
  - Hobby: 1000 requests/hour, 10 requests/second
  - Pro: 10,000 requests/hour, 50 requests/second

#### 3. Environment Variables
```bash
RAILWAY_TOKEN=your_token_here
RAILWAY_PROJECT_ID=your_project_id_here
```

#### 4. GraphQL Schema Discovery
Access the GraphiQL playground at: https://railway.com/graphiql

Key queries and mutations to implement:

```graphql
# Deploy a project
mutation DeployProject($projectId: String!, $environmentId: String!) {
  deploymentCreate(
    projectId: $projectId
    environmentId: $environmentId
  ) {
    id
    status
    createdAt
  }
}

# Get deployment status
query GetDeployment($id: String!) {
  deployment(id: $id) {
    id
    status
    createdAt
    completedAt
    url
  }
}

# List deployments
query ListDeployments($projectId: String!, $limit: Int) {
  deployments(projectId: $projectId, first: $limit) {
    edges {
      node {
        id
        status
        createdAt
        completedAt
      }
    }
  }
}

# Get deployment logs
query GetDeploymentLogs($deploymentId: String!) {
  deploymentLogs(deploymentId: $deploymentId) {
    timestamp
    message
    level
  }
}

# Cancel deployment
mutation CancelDeployment($id: String!) {
  deploymentCancel(id: $id) {
    id
    status
  }
}
```

#### 5. Implementation Steps

1. **Add GraphQL client to railway-provider.ts:**
```typescript
import { GraphQLClient } from 'graphql-request';

export class RailwayProvider extends BaseProvider {
  private static readonly API_ENDPOINT = 'https://backboard.railway.app/graphql/v2';
  private client?: GraphQLClient;

  private getGraphQLClient(): GraphQLClient {
    if (!this.client) {
      const token = this.getToken();
      this.client = new GraphQLClient(RailwayProvider.API_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    return this.client;
  }
}
```

2. **Implement deployment method:**
```typescript
protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
  const client = this.getGraphQLClient();
  const projectId = this.getProjectId();

  const mutation = `
    mutation DeployProject($projectId: String!) {
      deploymentCreate(projectId: $projectId) {
        id
        status
        createdAt
      }
    }
  `;

  const data = await client.request(mutation, { projectId });

  // Map response to DeploymentResult
  return {
    deploymentId: data.deploymentCreate.id,
    status: this.mapRailwayStatus(data.deploymentCreate.status),
    // ... rest of mapping
  };
}
```

3. **Implement remaining methods following the same pattern**

#### 6. Estimated Effort
- Setup and configuration: 1 hour
- Schema discovery and type definitions: 2 hours
- Implementation of 8 methods: 4-5 hours
- Testing and debugging: 1-2 hours
- **Total: 8-10 hours**

---

## AWS Provider Implementation

### Current Status
- All methods return mock data with warnings
- AWS SDK not installed
- No real AWS integration

### Requirements

#### 1. Install AWS SDK
Multiple AWS SDK packages are required depending on deployment strategy:

```bash
npm install @aws-sdk/client-amplify \
  @aws-sdk/client-s3 \
  @aws-sdk/client-cloudfront \
  @aws-sdk/client-lambda \
  @aws-sdk/client-ec2 \
  @aws-sdk/client-ecs \
  @aws-sdk/client-cloudformation \
  @aws-sdk/client-sts
```

#### 2. AWS Configuration
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

#### 3. Deployment Strategies

AWS deployments vary significantly based on application type:

**Strategy 1: Static Sites (S3 + CloudFront)**
```typescript
// 1. Upload files to S3 bucket
// 2. Configure bucket for static website hosting
// 3. Create/update CloudFront distribution
// 4. Invalidate CloudFront cache
```

**Strategy 2: Serverless (Lambda + API Gateway)**
```typescript
// 1. Package application as Lambda function
// 2. Deploy to Lambda
// 3. Configure API Gateway
// 4. Map routes to Lambda functions
```

**Strategy 3: Containers (ECS/Fargate)**
```typescript
// 1. Build Docker image
// 2. Push to ECR (Elastic Container Registry)
// 3. Create/update ECS task definition
// 4. Deploy to ECS cluster
```

**Strategy 4: Traditional (EC2 + Load Balancer)**
```typescript
// 1. Launch EC2 instances
// 2. Configure security groups
// 3. Set up Application Load Balancer
// 4. Deploy application code
```

#### 4. Implementation Complexity

The AWS provider is the most complex because it requires:
- Multiple deployment strategies
- Infrastructure as Code (CloudFormation templates)
- Service-specific configurations
- Complex status monitoring across multiple services
- Cost calculation across various services

#### 5. Recommended Approach

**Phase 1: Basic Static Site Deployment (S3 + CloudFront)**
- Implement S3 upload functionality
- Configure static website hosting
- Set up CloudFront distribution
- Estimated: 4-6 hours

**Phase 2: Serverless Deployment (Lambda)**
- Package and deploy Lambda functions
- Configure API Gateway
- Estimated: 4-6 hours

**Phase 3: Container Deployment (ECS)**
- Build and push Docker images
- Deploy to ECS/Fargate
- Estimated: 6-8 hours

**Phase 4: Complete Implementation**
- All deployment methods
- Comprehensive status monitoring
- Cost estimation
- Log aggregation from CloudWatch
- Estimated: 12-16 hours total

#### 6. Implementation Example (S3 Static Deployment)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export class AWSProvider extends BaseProvider {
  private s3Client?: S3Client;
  private cloudFrontClient?: CloudFrontClient;

  protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
    // 1. Collect files
    const files = await this.collectFiles(config.projectPath);

    // 2. Upload to S3
    const bucketName = this.getBucketName();
    const s3 = this.getS3Client();

    for (const file of files) {
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: file.path,
        Body: file.content,
        ContentType: this.getContentType(file.path),
      }));
    }

    // 3. Invalidate CloudFront cache
    const distributionId = await this.getDistributionId(bucketName);
    const cloudFront = this.getCloudFrontClient();

    await cloudFront.send(new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: { Quantity: 1, Items: ['/*'] },
        CallerReference: Date.now().toString(),
      },
    }));

    return {
      deploymentId: `aws-${Date.now()}`,
      url: `https://${distributionId}.cloudfront.net`,
      status: 'ready',
      // ... rest of result
    };
  }
}
```

---

## Testing Strategy

### Railway Provider Testing
1. Create Railway test project
2. Generate test token
3. Implement and test each method incrementally
4. Verify GraphQL queries in GraphiQL first
5. Monitor rate limits during testing

### AWS Provider Testing
1. Create test AWS account or use sandbox
2. Start with S3 static deployment (simplest)
3. Test each deployment strategy separately
4. Monitor AWS costs during testing
5. Clean up resources after testing

---

## Implementation Checklist

### Railway Provider
- [ ] Install `graphql` and `graphql-request` packages
- [ ] Create GraphQL client helper methods
- [ ] Discover schema via GraphiQL playground
- [ ] Define TypeScript interfaces for GraphQL responses
- [ ] Implement `deployImplementation()`
- [ ] Implement `getDeploymentStatusImplementation()`
- [ ] Implement `getDeploymentLogsImplementation()`
- [ ] Implement `cancelDeploymentImplementation()`
- [ ] Implement `listDeploymentsImplementation()`
- [ ] Implement `rollbackImplementation()`
- [ ] Implement `estimateCostImplementation()`
- [ ] Implement `getHealthStatusImplementation()`
- [ ] Add error handling with error factories
- [ ] Write integration tests
- [ ] Update documentation

### AWS Provider
- [ ] Install AWS SDK packages
- [ ] Decide on deployment strategy (S3, Lambda, ECS, or all)
- [ ] Create AWS client initialization methods
- [ ] Implement file upload to S3
- [ ] Configure S3 bucket for static hosting
- [ ] Set up CloudFront distribution
- [ ] Implement deployment status monitoring
- [ ] Implement log retrieval from CloudWatch
- [ ] Implement deployment cancellation
- [ ] Implement deployment listing
- [ ] Implement rollback functionality
- [ ] Calculate accurate cost estimates
- [ ] Implement health status checks
- [ ] Add comprehensive error handling
- [ ] Write integration tests
- [ ] Update documentation

---

## Success Criteria

### Railway Provider
- All 8 methods return real data from Railway API
- GraphQL queries execute successfully
- Deployments can be triggered and monitored
- Logs are retrieved accurately
- No mock data returned

### AWS Provider
- At least one deployment strategy fully functional
- Files successfully uploaded to S3
- Static sites accessible via CloudFront
- Status monitoring works across AWS services
- Cost estimates reflect actual AWS pricing
- No mock data returned

---

## Notes

- **Security:** Never commit API keys or tokens to version control
- **Rate Limiting:** Implement exponential backoff for API calls
- **Error Handling:** Use centralized error factory functions
- **Testing:** Test with small projects first to minimize costs
- **Documentation:** Update provider documentation as you implement

---

## Resources

### Railway
- API Documentation: https://docs.railway.com/reference/public-api
- GraphiQL Playground: https://railway.com/graphiql
- Public API Guide: https://docs.railway.com/guides/public-api

### AWS
- AWS SDK for JavaScript v3: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- S3 Documentation: https://docs.aws.amazon.com/s3/
- CloudFront Documentation: https://docs.aws.amazon.com/cloudfront/
- Lambda Documentation: https://docs.aws.amazon.com/lambda/
- AWS Pricing Calculator: https://calculator.aws/

---

*Last Updated: 2025-10-02*
