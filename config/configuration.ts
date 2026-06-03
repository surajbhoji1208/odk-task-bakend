export const configuration = () => {
    // Log loaded environment variables for debugging
    console.log("Environment Configuration Loaded:");

    const config = {
        server: {
            env: process.env.NODE_ENV,
            port: process.env.PORT
        },

        db: {
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            username: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASS,
            database: process.env.DATABASE_NAME,
            synchronize: process.env.DATABASE_SYNC == "true",
            logging: process.env.DATABASE_LOG == "true",
            cache: process.env.DATABASE_CACHE == "true"
        },
        swagger: {
            user: process.env.SWAGGER_USER,
            password: process.env.SWAGGER_PASSWORD
        }
    };

    // Log configuration (with sensitive data masked)
    // console.log(config)

    console.log("Environment configuration loaded successfully\n");
    console.log("=====================================");

    return config;
};
