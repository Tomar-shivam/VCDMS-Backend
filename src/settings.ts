import dotenv from 'dotenv';

// load the environment variables from the .env file
dotenv.config({
    path: '.env.dev'
});

class Settings{
    GetEnvironmentConfig(){
        return dotenv.config;
    }
}

export const settings = new Settings();