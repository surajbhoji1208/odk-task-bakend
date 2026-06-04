import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('db.host'),
                port: config.get<number>('db.port'),
                username: config.get<string>('db.username'),
                password: config.get<string>('db.password'),
                database: config.get<string>('db.database'),
                entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
                migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
                synchronize: false,
                logging: config.get<string>('NODE_ENV') !== 'production',
            }),
        }),
    ],
})
export class TypeOrmSharedModule { }