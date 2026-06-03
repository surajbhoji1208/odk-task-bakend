export interface IAppResponse<T extends object | object[] = object | object[]> {
    message: string;
    data?: T;
}
