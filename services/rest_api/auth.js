import crypto from 'crypto';
import { TG_BOT_TOKEN } from '../shared/constants/service.js';

export const verifyTelegramWebAppData = (initData) => {
    try {
        const urlParams = new URLSearchParams(initData);

        const hash = urlParams.get('hash');
        if (!hash) return { isValid: false, error: "Hash empty" };

        const authDate = parseInt(urlParams.get('auth_date'));
        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime - authDate > 86400) {
            return { isValid: false, error: "Data expired (older than 24 hours)" };
        }

        urlParams.delete('hash');

        const dataCheckArray = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArray.push(`${key}=${value}`);
        }
        dataCheckArray.sort();
        const dataCheckString = dataCheckArray.join('\n');

        const botTokenKey = crypto.createHmac('sha256', 'WebAppData')
            .update(TG_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', botTokenKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            return { isValid: false, error: "Invalid signature" };
        }

        const userData = JSON.parse(decodeURIComponent(urlParams.get('user')));

        const userId = userData.id;
        const userName = userData.username || userData.first_name;

        return {
            isValid: true,
            userId,
            userName
        };
    } catch (error) {
        console.error("Error verifying initData:", error);
        return { isValid: false, error: "Verification error: " + error.message };
    }
};