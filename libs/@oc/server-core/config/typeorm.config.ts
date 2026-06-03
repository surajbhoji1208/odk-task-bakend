import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("db.host"),
        port: configService.get<number>("db.port"),
        username: configService.get("db.username"),
        password: configService.get("db.password"),
        database: configService.get("db.database"),
        logging: configService.get("db.logging") ? [
            "query",
            "error",
            "schema",
            "warn",
            "info",
            "log"
        ] : false,
        cache: configService.get("db.cache"),
        // ssl: {
        //     rejectUnauthorized: false // when ssl-mode = require in postgres db server
        // },
        synchronize: configService.get("db.synchronize"),
        entities: [__dirname + "/../database/entities/*.entity{.ts,.js}"],
    }),
    dataSourceFactory: async (options: DataSourceOptions) => {
        const dataSource = await new DataSource(options).initialize();
        return dataSource;
    }
};
