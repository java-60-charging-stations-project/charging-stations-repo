# This is an AWS deployment config - forked from main  

DO NOT FORGET TO DELETE THE BACKEND STACK YOU DEPLOYED AFTER TESTING!!!!!!!!!!!  

`sam delete` should always be your last command  

MAKE SURE YOU DELETE YOUR ALB AFTER TESTING



Current setup - 


## Difference from main 

###  Frontend   

Modified `endpoint='/health?deep=true'/` in App.tsx
Simple way to point frontend towards deep health check. Should be handled more gracefully later  

### Backend 

in health.controller.ts

passed `deep` argument from request parameter

in health.service.ts  

added handling of  `deep` request parameter  


## Deployment

### Backend

Deploy backend to fargate via `sam build --guided` from /backend folder  
Provide your own AWS services config as parameters

Prerequisites - setup AWS ALB (pass its URL as env variable `apiBaseUrl` in frontend) and Target Group  
**Currently ALB should listen to HTTP requests at port 80 as security features not yet implemented**  
create log group /ecs/charging-stations-backend  
create AWS Cognito Pool
create ECR docker image for fargate 

Required IAM role permissions: 

AmazonEC2ContainerRegistryFullAccess  
AmazonECS_FullAccess  
AmazonS3FullAccess (maybe)  
AmazonSNSFullAccess (unlikely)  
AmazonVPCFullAccess  
AWSCloudFormationFullAccess  
AWSLambda_FullAccess  

Plus these inline policies (maybe some are not required)

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:PutRolePolicy",
                "iam:AttachRolePolicy",
                "iam:GetRole",
                "iam:PassRole",
                "iam:DeleteRole",
                "iam:DeleteRolePolicy",
                "iam:DetachRolePolicy",
                "iam:TagRole",
                "iam:UntagRole",
                "logs:DeleteLogGroup",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:DeleteLogStream",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}


{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:DescribeLogGroups",
                "logs:PutRetentionPolicy",
                "logs:DeleteLogGroup"
            ],
            "Resource": "arn:aws:logs:il-central-1:852215679994:log-group:/ecs/charging-stations-backend"
        }
    ]
}

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:il-central-1:852215679994:calculatorTopic"
        }
    ]
}  


### Lambdas deployment  

#### Routes  

Deploy route lambdas via `sam build --guided` from /lambdas/routes folder  

##### Health Lambda  

Optional parameters - `InvokerAccountIdA` and `InvokerAccountIdB` - AWS IDs of accounts that can invoke health lambda  

### Frontend deployment

Prerequisites: installed vite packages via `npm install`

Straightforward `npm run dev` if you passed your ALB URL address as env variable `apiBaseUrl`
Even simpler `$env:VITE_API_BASE_URL="http://`**Your ALB address**"`; npm run dev` 