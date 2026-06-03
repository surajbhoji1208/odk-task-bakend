import { DatabaseUniqueKey, UserEntityConstant } from "@core-constants";
import { BaseModifiableEntityWithoutIdentity } from "@core-database";
import * as bcrypt from "bcrypt";
import {
    BeforeInsert,
    Column,
    Entity,
    PrimaryGeneratedColumn,
    Unique
} from "typeorm";
import { v4 as uuidv4 } from 'uuid';

/**
 * User entity representing user accounts in the system
 */
@Entity("user")
@Unique(DatabaseUniqueKey.UserEmailUserType, ["uuid", "email", "roleId", "deletedAt"])
export class User extends BaseModifiableEntityWithoutIdentity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "uuid",
        name: "uuid",
        unique: true
    })
    uuid: string;

    @Column({
        type: "varchar",
        length: UserEntityConstant.FullNameMaxLength,
        name: "full_name",
        nullable: false
    })
    fullName: string;

    @Column({
        type: "varchar",
        length: UserEntityConstant.EmailMaxLength,
        name: "email",
        nullable: false
    })
    email: string;

    @Column({
        type: "varchar",
        length: UserEntityConstant.EncryptedPasswordMaxLength,
        name: "password",
        nullable: true
    })
    password: string | null;

    @Column({
        type: "varchar",
        length: UserEntityConstant.SaltMaxLength,
        name: "salt",
        nullable: true
    })
    salt: string | null;

    @Column({
        type: "varchar",
        length: UserEntityConstant.PhoneNumberMaxLength,
        name: "phone_number",
        nullable: true
    })
    phoneNumber: string | null;


    @Column({
        type: "boolean",
        name: "is_password_changed",
        default: false
    })
    isPasswordChanged: boolean;



    /**
     * Hash password and generate uuid before inserting to database
     */
    @BeforeInsert()
    async lifecycleHooks() {
        if (this.password) {
            this.salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, this.salt);
        }

        if (!this.uuid) {
            this.uuid = uuidv4();
        }
    }

    /**
     * Validate password against stored hash
     * @param password - Plain text password to validate
     * @returns Promise<boolean> - True if password is valid
     */
    async validatePassword(password: string): Promise<boolean> {
        if (!this.password || !this.salt) {
            return false;
        }
        const hash = await bcrypt.hash(password, this.salt);
        return hash === this.password;
    }

    /**
     * Update password with new salt
     * @param newPassword - New plain text password
     */
    async updatePassword(newPassword: string): Promise<void> {
        this.salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(newPassword, this.salt);
        this.isPasswordChanged = true;
    }
}
