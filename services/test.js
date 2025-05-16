// const addresses = [
//     "8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn",
//     "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
//     "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
//     "8BtoThi2ZoXnF7QQK1Wjmh2JuBw9FjVvhnGMVZ2vpump",
//     "So11111111111111111111111111111111111111112",
//     "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs",
//     "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",
//     "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
//     "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
//     "FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump",
//     "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
//     "6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx",
//     "61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump",
//     "HNg5PYJmtqcmzXrv6S9zP1CDKk5BgDuyFBxbvNApump",
//     "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
//     "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
//     "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
//     "38PgzpJYu2HkiYvV8qePFakB8tuobPdGm2FFEn7Dpump",
//     "LAYER4xPpTCb3QL8S9u41EAhAX7mhBn8Q6xMTwY2Yzc",
//     "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9",
//     "FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P",
//     "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
//     "KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP",
//     "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
//     "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
//     "GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump",
//     "DKu9kykSfbN5LBfFXtNNDPaX35o4Fv6vJ9FKk7pZpump",
//     "74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump",
//     "DitHyRMQiSDhn5cnKMJV2CDDt6sVct96YrECiM49pump"
// ];

// async function main() {
//   try {
//     // Получение списка всех монет
//     console.log('Получение списка монет...');
//     const coinListResponse = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true');
//     const coinList = await coinListResponse.json();
//     await new Promise(resolve => setTimeout(resolve, 10000));
    
//     // Фильтрация монет с адресами Solana из нашего списка
//     console.log('Фильтрация монет с нужными адресами Solana...');
//     const matchingCoins = coinList.filter(coin => {
//       if (!coin.platforms || !coin.platforms.solana) return false;
//       return addresses.includes(coin.platforms.solana);
//     });
    
//     console.log(`Найдено ${matchingCoins.length} монет с подходящими адресами Solana`);
    
//     // Запрос дополнительной информации для каждой монеты
//     console.log('Получение дополнительной информации о монетах...');
//     const tokenDetails = [];
    
//     for (const coin of matchingCoins) {
//       try {
//         console.log(`Получение информации для ${coin.id}...`);
//         const coinInfoResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`);
//         const coinInfo = await coinInfoResponse.json();
        
//         // Извлечение нужных данных
//         tokenDetails.push({
//           address: coin.platforms.solana,
//           symbol: coinInfo.symbol,
//           decimals: coinInfo.detail_platforms?.solana?.decimal_place || 0,
//           logo_url: coinInfo.image?.large || ''
//         });
        
//         // Небольшая задержка, чтобы не превысить лимиты API
//         await new Promise(resolve => setTimeout(resolve, 15000));
//       } catch (error) {
//         console.error(`Ошибка при получении данных для ${coin.id}:`, error.message);
//       }
//     }
    
//     // Формирование SQL запроса
//     console.log('Формирование SQL запроса...');
//     let sqlQuery = 'INSERT INTO protocol_tokens (address, symbol, decimals, logo_url) VALUES\n';
    
//     const values = tokenDetails.map(token => 
//       `('${token.address}', '${token.symbol}', ${token.decimals}, '${token.logo_url}')`
//     );
    
//     sqlQuery += values.join(',\n') + ';';
    
//     console.log('SQL запрос сформирован:');
//     console.log(sqlQuery);
    
//     return sqlQuery;
//   } catch (error) {
//     console.error('Произошла ошибка:', error.message);
//     throw error;
//   }
// }

// // Запуск скрипта
// main()
//   .then(sqlQuery => {
//     console.log('Скрипт выполнен успешно');
//   })
//   .catch(error => {
//     console.error('Ошибка выполнения скрипта:', error);
//   });

import { transferFeeToAdminWallet } from './rest_api/views.js';


  
const data = await transferFeeToAdminWallet(1000000)
console.log(data)