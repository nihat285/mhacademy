import "dotenv/config";
// Integration tests run against a dedicated database, never the dev data.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
