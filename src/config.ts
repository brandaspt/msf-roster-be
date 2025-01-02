export const envVars = {
  APP_ROOT_URL: process.env.APP_ROOT_URL,
  FRONTEND_ROOT_URL: process.env.FRONTEND_ROOT_URL,
  MSF_API_ROOT: process.env.MSF_BASE_URL,
  CLIENT_ID: process.env.MSF_CLIENT_ID,
  CLIENT_SECRET: process.env.MSF_CLIENT_SECRET,
  APP_CALLBACK_URL: process.env.APP_CALLBACK_URL,
  MSF_API_KEY: process.env.MSF_API_KEY,
  MSF_AUTH_URL: process.env.MSF_AUTH_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT || 6379
}
