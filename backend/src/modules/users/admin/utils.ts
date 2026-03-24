import { Attribute, UserFull, UserShort } from "./types";
import { AdminGetUserResponse,
    ListUsersResponse,
    UserType,
    AttributeType
} from "@aws-sdk/client-cognito-identity-provider";

 
const UNKNOWN_STATUS = "UNKNOWN";

function getAttributeValue(attributes: Attribute[], attributeName: string): string | undefined {
    return attributes.find(attribute => attribute.name === attributeName)?.value ?? undefined;
}

export function unpackAdminGetUserResponse(cognitoResponse: AdminGetUserResponse): UserShort {
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
        status: cognitoResponse.UserStatus ?? UNKNOWN_STATUS,
    };
}

export function unpackAdminListUserResponse(cognitoResponse: UserType): UserShort {
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
        status: cognitoResponse.UserStatus ?? UNKNOWN_STATUS,
    };
}

export function unpackListUsersResponse(cognitoResponse: ListUsersResponse): UserShort[] {
    return cognitoResponse.Users?.map(user => unpackAdminListUserResponse(user)) ?? [];
};

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