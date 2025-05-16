import "../constants/env.js"
import pg from "pg";


const { Pool } = pg;

export const getPgPool = () => {
    try {
        return new Pool({
            host: process.env.POSTGRES_HOST,
            port: process.env.POSTGRES_PORT,
            user: process.env.POSTGRES_USER,
            database: process.env.POSTGRES_DATABASE,
            password: process.env.POSTGRES_PASSWORD,
            max: process.env.POSTGRES_POOL_LIMIT
                ? process.env.POSTGRES_POOL_LIMIT
                : 100,
            // ssl: { rejectUnauthorized: false },
        });
    } catch (error) {
        console.log("getPgPool", error);
        return null;
    }
};