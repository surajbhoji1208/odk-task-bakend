import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeOrmSharedModule — uncomment once .env is configured:
    // TypeOrmSharedModule,
    //
    // Feature modules go here:
    // UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }