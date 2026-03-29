import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  type InitiateAuthCommandInput,
  type SignUpCommandInput,
  type ConfirmSignUpCommandInput,
  type InitiateAuthCommandOutput,
  type AuthenticationResultType,
  type ResendConfirmationCodeRequest,
  ResendConfirmationCodeCommand,
  UserNotConfirmedException,
  type GetTokensFromRefreshTokenRequest,
  type GetTokensFromRefreshTokenResponse,
  GetTokensFromRefreshTokenCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getLogger } from '@/services/logging';
import { config } from '@/config/env';
import { parseJwt } from "./jwtService";
import type { AuthDataType, AuthPayload, UserRole } from "@/types";
import { NotConfirmedError } from "@/types/errors";

const logger = getLogger("authService");

export const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognitoRegion,
});

export const initiateSignIn = async (email: string, password: string): Promise<AuthenticationResultType | undefined> => {
  const params: InitiateAuthCommandInput = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.cognitoClientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };
  const command = new InitiateAuthCommand(params);
  try {
    const cognitoResponse: InitiateAuthCommandOutput = await cognitoClient.send(command);
    logger.debug(".initiateSignIn Cognito response: ", cognitoResponse);
    const authenticationResult = cognitoResponse.AuthenticationResult;
    logger.debug(".initiateSignIn authentication result: ", authenticationResult);
    
    return authenticationResult;
  } catch (error) {
    if (error instanceof UserNotConfirmedException) {
      throw new NotConfirmedError(error.message, { cause: error });
    }
    throw error;
  }
};

export const signUp = async (email: string, password: string, name: string) => {
  const params: SignUpCommandInput = {
    ClientId: config.cognitoClientId,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "name",
        Value: name,
      },
    ],
  };
  try {
    const command = new SignUpCommand(params);
    logger.debug(".signUp command: ", command);
    const response = await cognitoClient.send(command);
    logger.debug("Sign up success, Response=", response);
    return response;
  } catch (error) {
    logger.error("Error signing up: ", error);
    throw error;
  }
};

export const confirmSignUp = async (username: string, code: string) => {
  const params: ConfirmSignUpCommandInput = {
    ClientId: config.cognitoClientId,
    Username: username,
    ConfirmationCode: code,
  };
  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    logger.debug("User confirmed successfully");
    return true;
  } catch (error) {
    logger.error("Error confirming sign up: ", error);
    throw error;
  }
};

export const resendConfirmationCode = async (username: string) => {
  const input: ResendConfirmationCodeRequest = {
    ClientId: config.cognitoClientId,
    Username: username,
  };
  const command = new ResendConfirmationCodeCommand(input);
  try {
    const response = await cognitoClient.send(command);
    console.debug(".ResendConfirmationCode response: ", response);
  } catch (error) {
    logger.error("Error resending confirmation code: ", error);
    throw error;
  }
}

function getUserRole(userGroups: string[]): UserRole {
  if (userGroups.includes(config.adminGroupName)) {
    return "ADMIN";
  }
  if (userGroups.includes(config.supportGroupName)) {
    return "SUPPORT";
  }
  return "USER";
}


function unpackAuthResult({ AccessToken, IdToken, RefreshToken, TokenType}: AuthenticationResultType,
  existingRefreshToken?: string
): AuthDataType {
  if (!AccessToken) {
    throw Error("No access token retrieved");
  }
  if (!IdToken) {
    throw new Error("No ID token retrieved");
  }
  RefreshToken = RefreshToken ?? existingRefreshToken;
  if (!RefreshToken) {
    throw new Error("No refresh token retrieved");
  }
  if (!(TokenType === 'Bearer')) {
    throw new Error("Wrong token type retrieved");
  }
  const payload: AuthPayload = parseJwt(IdToken);
  logger.debug("Auth payload: ", payload);
  const { sub, email, "cognito:groups": groups } = payload;
  if (!sub) {
    throw Error("Wrong token format: sub claim is required");
  }
  if (!email) {
    throw Error("Wrong token format: email claim is required");
  }
  const userRole = getUserRole(groups ?? []);
  return {
    user: { id: sub, email, userRole },
    session: {accessToken: AccessToken, refreshToken: RefreshToken},
  } 
}

export const getTokensFromRefreshToken = async (refreshToken: string) => {
  const input: GetTokensFromRefreshTokenRequest = { // GetTokensFromRefreshTokenRequest
    RefreshToken: refreshToken,
    ClientId: config.cognitoClientId,
  };
  const command = new GetTokensFromRefreshTokenCommand(input);
  const response: GetTokensFromRefreshTokenResponse = await cognitoClient.send(command);
  const authResult = response.AuthenticationResult;
  if (!authResult) {
    throw Error("Empty authentication result");
  }
  return unpackAuthResult(authResult, refreshToken);
};

export const signIn = async (email: string, password: string): Promise<AuthDataType> => {
  const authResult = await initiateSignIn(email, password);
  if (!authResult) {
    throw Error("Empty authentication result");
  }
  return unpackAuthResult(authResult);
}