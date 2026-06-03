import { ApiProperty } from "@nestjs/swagger";
import { IAppResponse } from "libs/@oc/server-core/interfaces";

/**
 * Standardized API response wrapper
 */
export class AppResponse<T extends object | object[]> implements IAppResponse {
    /**
     * Constructor for AppResponse
     * @param message - The response message
     * @param data - The response data
     * @param parameters - Additional parameters for message formatting
     */
    constructor(message: string, data: object | object[] | undefined | T, parameters?: { [key: string]: any }) {
        this.message = message;
        this.data = data;
        this.parameters = parameters || {};
    }

    @ApiProperty({
        description: "A message describing the result of the API call",
        example: "Message for api action"
    })
    message: string;

    @ApiProperty({
        description: "The data returned by the API"
    })
    data: object | object[] | undefined | T;

    parameters: { [key: string]: any };
}