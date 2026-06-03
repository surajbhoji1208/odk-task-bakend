export const UserEntityConstant = {
    FullNameMaxLength: 100,
    EmailMaxLength: 255,
    PasswordMaxLength: 255,
    PhoneNumberMaxLength: 15,
    EncryptedPasswordMaxLength: 255,
    SaltMaxLength: 255,
};

export enum DatabaseUniqueKey {
    UserEmailUserType = 'UQ_user_email_user_type_deleted_at',
}


export const SuccessConstant = {
    AddSuccessAction: 'ADD_SUCCESS',
    UpdateSuccessAction: 'UPDATE_SUCCESS',
    RemoveSuccessAction: 'REMOVE_SUCCESS',
    DetailFetch: 'DETAIL_FETCH',
    ListFetch: 'LIST_FETCH',
    SuccessAction: 'SUCCESS',
};

export function MapToModuleName(module: any): string {
    const map: Record<any, string> = {
        [module.USER]: 'User',
    };
    return map[module];
}

export * from './permissions.constant'