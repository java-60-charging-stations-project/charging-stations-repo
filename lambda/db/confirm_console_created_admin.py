import json
import os
import boto3
from botocore.exceptions import ClientError
from utils.logger import logger, log_audit
from typing import Any

CLIENT_ID = os.environ["COGNITO_CLIENT_ID"]          # from template
COGNITO_REGION = os.environ.get("COGNITO_REGION", "il-central-1")


def initiate_auth(client: boto3.client, username: str, password: str) -> dict:
    return client.initiate_auth(
        AuthFlow="USER_PASSWORD_AUTH",
        ClientId=CLIENT_ID,
        AuthParameters={
            "USERNAME": username,
            "PASSWORD": password,
        },
    )


def respond_to_new_password_challenge(
    client: boto3.client, username: str, new_password: str, session: str
) -> dict:
    return client.respond_to_auth_challenge(
        ClientId=CLIENT_ID,
        ChallengeName="NEW_PASSWORD_REQUIRED",
        Session=session,
        ChallengeResponses={
            "USERNAME": username,
            "NEW_PASSWORD": new_password,
            "userAttributes.name": "Console User",
        },
    )

def handler(event: dict, context: Any) -> dict:
    logger.info(f"Handler called with event: {event}")
    try:
        username = event.get("username")
        password = event.get("password")
        new_password = event.get("new_password")
        if not username or not password:
            raise ValueError("Username and password are required")
        client = boto3.client("cognito-idp", region_name=COGNITO_REGION)
        resp = initiate_auth(client, username, password)
        challenge_name = resp.get("ChallengeName")
        # First login: NEW_PASSWORD_REQUIRED challenge
        if challenge_name == "NEW_PASSWORD_REQUIRED":
            if not new_password:
                raise ValueError("New password is required during first login")
            resp = respond_to_new_password_challenge(
                client, username, new_password, resp["Session"]
            )
            logger.info(
                f"respond_to_auth_challenge response: {json.dumps(resp, default=str)}"
            )
            message = "Password changed and login successful"
        elif challenge_name:
            # Some other challenge we don't handle here
            raise ValueError(f"Unsupported Cognito challenge: {challenge_name}")
        else:
            # No challenge => normal successful auth
            message = "Login successful"
        auth_result = resp.get("AuthenticationResult", {}) or {}
        log_audit(
            "INFO",
            message="console created admin confirmed successfully",
            user_id=event.get("user_id"),
            service=context.function_name,
            event="CONFIRM_CONSOLE_CREATED_ADMIN",
            status="SUCCESS",
            request_id=context.aws_request_id,
            trigger=event.get("trigger"),
        )
        return {
            "message": message,
            "accessToken": auth_result.get("AccessToken"),
            "idToken": auth_result.get("IdToken"),
            "refreshToken": auth_result.get("RefreshToken"),
        }
    except ClientError as e:
        log_audit(
            "ERROR",
            message="error confirming console created admin",
            user_id=event.get("user_id"),
            service=context.function_name,
            event="CONFIRM_CONSOLE_CREATED_ADMIN",
            status="ERROR",
            errorMessage=str(e),
            request_id=context.aws_request_id,
            trigger=event.get("trigger"),
            )
        raise Exception(f"Invalid username or password: {e}")
    except Exception as e:
        log_audit(
            "ERROR",
            message="unhandled error",
            user_id=event.get("user_id"),
            service=context.function_name,
            event="CONFIRM_CONSOLE_CREATED_ADMIN",
            status="ERROR",
            errorMessage=str(e),
            request_id=context.aws_request_id,
            trigger=event.get("trigger"),
        )
        raise Exception(f"Unhandled error: {e}")