export class AppResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T;
    meta?: Record<string, unknown>;

    constructor(message: string, data: T, meta?: Record<string, unknown>) {
        this.success = true;
        this.message = message;
        this.data = data;
        if (meta) this.meta = meta;
    }
}