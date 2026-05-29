export const UserEntityConstant = {
    FirstNameMaxLength: 100,
    LastNameMaxLength: 100,
    EmailMaxLength: 255,
    PasswordMaxLength: 255,
};

export enum DatabaseUniqueKey {
    UserEmailUserType = 'UQ_user_email_user_type_deleted_at',
}

export enum ModuleName {
    USER = 'user',
}

export const SuccessConstant = {
    AddSuccessAction: 'ADD_SUCCESS',
    UpdateSuccessAction: 'UPDATE_SUCCESS',
    RemoveSuccessAction: 'REMOVE_SUCCESS',
    DetailFetch: 'DETAIL_FETCH',
    ListFetch: 'LIST_FETCH',
    SuccessAction: 'SUCCESS',
};

export function MapToModuleName(module: ModuleName): string {
    const map: Record<ModuleName, string> = {
        [ModuleName.USER]: 'User',
    };
    return map[module];
}