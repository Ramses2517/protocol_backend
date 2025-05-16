import "../constants/env.js"
import pg from "pg";


const {Client} = pg;

export const getPgClient = async () => {
    try {
        const client = new Client({
            host: process.env.POSTGRES_HOST,
            port: process.env.POSTGRES_PORT,
            user: process.env.POSTGRES_USER,
            database: process.env.POSTGRES_DATABASE,
            password: process.env.POSTGRES_PASSWORD,
        });
        await client.connect()
        return client
    } catch (error) {
        console.log("getPgClient", error);
        return null;
    }
};