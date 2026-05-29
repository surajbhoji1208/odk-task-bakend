import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';
import { FieldTypeEnum } from '../enums';

// ─── @ValidateNotEmpty ────────────────────────────────────────────────────────

export function ValidateNotEmpty(options?: {
    constraints?: { field: string };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateNotEmpty',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_REQUIRED', field: options?.constraints?.field ?? propertyName }),
                ...options?.validationOptions,
            },
            validator: {
                validate(value: any) {
                    return value !== null && value !== undefined && value !== '';
                },
            },
        });
    };
}

// ─── @ValidateType ────────────────────────────────────────────────────────────

export function ValidateType(options?: {
    constraints?: { field: string; type: FieldTypeEnum };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateType',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_TYPE', field: options?.constraints?.field ?? propertyName }),
                ...options?.validationOptions,
            },
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (value === undefined || value === null) return true;
                    const type = options?.constraints?.type;
                    if (type === FieldTypeEnum.String) return typeof value === 'string';
                    if (type === FieldTypeEnum.Number) return typeof value === 'number';
                    if (type === FieldTypeEnum.Boolean) return typeof value === 'boolean';
                    if (type === FieldTypeEnum.UUID) {
                        return typeof value === 'string' &&
                            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
                    }
                    return true;
                },
            },
        });
    };
}

// ─── @ValidateOptional ────────────────────────────────────────────────────────

export function ValidateOptional(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateOptional',
            target: (object as any).constructor,
            propertyName,
            options: { ...validationOptions },
            validator: {
                validate() { return true; },
            },
        });
    };
}

// ─── @ValidateEmail ───────────────────────────────────────────────────────────

export function ValidateEmail(options?: {
    constraints?: { field: string };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateEmail',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_NOT_VALID', field: options?.constraints?.field ?? propertyName }),
                ...options?.validationOptions,
            },
            validator: {
                validate(value: any) {
                    if (value === undefined || value === null) return true;
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                },
            },
        });
    };
}

// ─── @ValidateMinLength ───────────────────────────────────────────────────────

export function ValidateMinLength(options: {
    constraints: { field: string; min: number };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateMinLength',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_MIN_LENGTH', field: options.constraints.field, min: options.constraints.min }),
                ...options.validationOptions,
            },
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return true;
                    return value.length >= options.constraints.min;
                },
            },
        });
    };
}

// ─── @ValidateMaxLength ───────────────────────────────────────────────────────

export function ValidateMaxLength(options: {
    constraints: { field: string; max: number };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateMaxLength',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_MAX_LENGTH', field: options.constraints.field, max: options.constraints.max }),
                ...options.validationOptions,
            },
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return true;
                    return value.length <= options.constraints.max;
                },
            },
        });
    };
}

// ─── @ValidateEnumType ────────────────────────────────────────────────────────

export function ValidateEnumType(options: {
    constraints: { field: string; enum: object };
    validationOptions?: ValidationOptions;
}) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'ValidateEnumType',
            target: (object as any).constructor,
            propertyName,
            options: {
                message: JSON.stringify({ key: 'ERR_IS_ENUM', field: options.constraints.field }),
                ...options.validationOptions,
            },
            validator: {
                validate(value: any) {
                    if (value === undefined || value === null) return true;
                    return Object.values(options.constraints.enum).includes(value);
                },
            },
        });
    };
}