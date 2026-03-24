export interface Attribute {
    name: string;
    value?: string;
};

export interface CognitoUser {
    userId: string;
    email: string;
    name: string;
    createDate: string;
    lastModifiedDate: string;
    enabled: boolean;
    status: string;
    attributes: Attribute[];
};

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