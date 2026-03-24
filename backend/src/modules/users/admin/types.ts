import { UserRole } from "../../../common/authRoles";

// RESPONSES
export type UserFull = {
    userId: string;
    email: string;
    name: string;
    createDate: string | null;
    lastModifiedDate: string | null;
    enabled: boolean;
    status: string;
    role: UserRole;
};

export type UserShort = Omit<UserFull, "role">;

export type UsersListResponse = {
    users: UserShort[];
    paginationToken: string | undefined;
}

export type AttributeName = "email" | "name";

export type ListUserFilter = {
    attributeName: AttributeName;
    attributeValue: string;
};

export type ListUserParameters = {
    limit: number;
    filter?: ListUserFilter;
    paginationToken?: string;
}

export type Attribute = {
    name: string;
    value?: string;
};

export type ChangeRoleParameters = {
    userId: string;
    oldRole: UserRole;
    newRole: UserRole;
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
