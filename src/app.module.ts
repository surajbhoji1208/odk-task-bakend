import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from 'config/configuration';
import { typeOrmConfig } from 'libs/@oc/server-core/config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env',
      load: [configuration],
      isGlobal: true
    }),
    // TypeOrmSharedModule — uncomment once .env is configured:
    // TypeOrmSharedModule,
    //
    // Feature modules go here:
    // UsersModule,
    TypeOrmModule.forRootAsync(typeOrmConfig),

  ],
  controllers: [],
  providers: [],
})
export class AppModule { }