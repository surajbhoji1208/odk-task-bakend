import { User } from "@core-database";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController } from "./user.controller";
import { UserRepository } from "libs/@oc/business-core/modules/user/user.repository";
import { UserService } from "libs/@oc/business-core/modules/user/user.service";

/**
 * User module configuration
 * Registers the user controller, service, repository, and database entities
 */
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService, UserRepository]
})
export class UserModule { }
