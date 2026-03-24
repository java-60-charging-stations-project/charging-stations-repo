import { UserInfo } from "../users.types";
import { Attribute, CognitoUser } from "./types";
import { AdminGetUserResponse,
    ListUsersResponse,
    UserType,
    AttributeType
 } from "@aws-sdk/client-cognito-identity-provider";

function getAttributeValue(attributes: Attribute[], attributeName: string): string | undefined {
    return attributes.find(attribute => attribute.name === attributeName)?.value ?? undefined;
}

export function unpackAdminGetUserResponse(cognitoResponse: AdminGetUserResponse): CognitoUser {
    const attributes: Attribute[] = cognitoResponse.UserAttributes?.filter(
        attribute => !!attribute.Name)?.map(
            attribute => ({ name: attribute.Name!, value: attribute.Value!})
        ) ?? [];
    return {
        userId: getAttributeValue(attributes, 'sub')!,
        email: getAttributeValue(attributes, 'email')!,
        name: getAttributeValue(attributes, 'name')!,
        createDate: cognitoResponse.UserCreateDate?.toISOString() ?? '',
        lastModifiedDate: cognitoResponse.UserLastModifiedDate?.toISOString() ?? '',
        enabled: cognitoResponse.Enabled ?? false,
        status: cognitoResponse.UserStatus ?? 'ACTIVE',
        attributes: attributes,
    };
}

export function unpackAdminListUserResponse(cognitoResponse: UserType): CognitoUser {
    const attributes: Attribute[] = cognitoResponse.Attributes?.filter(
        attribute => !!attribute.Name)?.map(
            attribute => ({ name: attribute.Name!, value: attribute.Value!})
        ) ?? [];
    return {
        userId: getAttributeValue(attributes, 'sub')!,
        email: getAttributeValue(attributes, 'email')!,
        name: getAttributeValue(attributes, 'name')!,
        createDate: cognitoResponse.UserCreateDate?.toISOString() ?? '',
        lastModifiedDate: cognitoResponse.UserLastModifiedDate?.toISOString() ?? '',
        enabled: cognitoResponse.Enabled ?? false,
        status: cognitoResponse.UserStatus ?? 'ACTIVE',
        attributes: attributes,
    };
}

export function unpackListUsersResponse(cognitoResponse: ListUsersResponse): CognitoUser[] {
    return cognitoResponse.Users?.map(user => unpackAdminListUserResponse(user)) ?? [];
}

export function getUserInfoFromCognitoUser(cognitoUser: CognitoUser): UserInfo {
    return {
        userId: cognitoUser.userId,
        username: cognitoUser.name,
        email: cognitoUser.email,
        phone: getAttributeValue(cognitoUser.attributes, 'phone') ?? "0123456789",
        role: "USER",
        status: cognitoUser.status,
        createdAt: cognitoUser.createDate,
        updatedAt: cognitoUser.lastModifiedDate,
    };
}
/****** Leaving this here for future references *******/

// { // ListUsersResponse
//   Users: [ // UsersListType
//     { // UserType
//       Username: "STRING_VALUE",
//       Attributes: [ // AttributeListType
//         { // AttributeType
//           Name: "STRING_VALUE", // required
//           Value: "STRING_VALUE",
//         },
//       ],
//       UserCreateDate: new Date("TIMESTAMP"),
//       UserLastModifiedDate: new Date("TIMESTAMP"),
//       Enabled: true || false,
//       UserStatus: "UNCONFIRMED" || "CONFIRMED" || "ARCHIVED" || "COMPROMISED" || "UNKNOWN" || "RESET_REQUIRED" || "FORCE_CHANGE_PASSWORD" || "EXTERNAL_PROVIDER",
//       MFAOptions: [ // MFAOptionListType
//         { // MFAOptionType
//           DeliveryMedium: "SMS" || "EMAIL",
//           AttributeName: "STRING_VALUE",
//         },
//       ],
//     },
//   ],
//   PaginationToken: "STRING_VALUE",
// };

// { // AdminGetUserResponse
//   Username: "STRING_VALUE", // required
//   UserAttributes: [ // AttributeListType
//     { // AttributeType
//       Name: "STRING_VALUE", // required
//       Value: "STRING_VALUE",
//     },
//   ],
//   UserCreateDate: new Date("TIMESTAMP"),
//   UserLastModifiedDate: new Date("TIMESTAMP"),
//   Enabled: true || false,
//   UserStatus: "UNCONFIRMED" || "CONFIRMED" || "ARCHIVED" || "COMPROMISED" || "UNKNOWN" || "RESET_REQUIRED" || "FORCE_CHANGE_PASSWORD" || "EXTERNAL_PROVIDER",
//   MFAOptions: [ // MFAOptionListType
//     { // MFAOptionType
//       DeliveryMedium: "SMS" || "EMAIL",
//       AttributeName: "STRING_VALUE",
//     },
//   ],
//   PreferredMfaSetting: "STRING_VALUE",
//   UserMFASettingList: [ // UserMFASettingListType
//     "STRING_VALUE",
//   ],
// };