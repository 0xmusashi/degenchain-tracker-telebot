const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
const pairAbi = require("./abi.json");
const tokenAbi = require('./erc20abi.json');
const factoryAbi = require('./factoryAbi.json');
const axios = require('axios');

const {
    saveToJsonFile,
    loadFromJsonFile,
    removeAddress,
    formatNumber
} = require('./utils');

const {
    TELEGRAM_BOT_TOKEN,
    RPC_URL,
    FACTORY_CONTRACT_ADDRESS,
    QUOTE_TOKEN_ADDRESS,
    QUOTE_TOKEN_SYMBOL,
    TX_EXPLORER_URL,
    QUOTE_TOKEN_DEXSCREENER_ADDRESS,
    BUY_EMOJI,
    SELL_EMOJI,
    CHAT_IDS,
    ADMIN_IDS,
    DEXSCREENER_API_ENDPOINT,
    ADDRESS_ZERO,
    CHART_URL,
    THRESHOLD
} = require('./constants');

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const factoryContract = new ethers.Contract(FACTORY_CONTRACT_ADDRESS, factoryAbi, provider);

async function main() {
    const addresses = await loadFromJsonFile();
    for (let tokenAddress in addresses) {
        const pairContractAddress = await factoryContract.getPair(tokenAddress, QUOTE_TOKEN_ADDRESS);
        if (pairContractAddress == ADDRESS_ZERO) {
            continue;
        }
        const contract = new ethers.Contract(pairContractAddress, pairAbi, provider);
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
        const symbol = await tokenContract.symbol();
        const totalSupply = await tokenContract.totalSupply();

        const token0 = await contract.token0();

        /* 
        event Swap(
            address indexed sender,
            uint amount0In,
            uint amount1In,
            uint amount0Out,
            uint amount1Out,
            address indexed to
        );
        */

        contract.on('Swap', async (sender, amount0In, amount1In, amount0Out, amount1Out, to, event) => {
            try {
                let isBuy = true;
                let formatAmount0In = parseFloat(ethers.utils.formatUnits(amount0In));
                let formatAmount1In = parseFloat(ethers.utils.formatUnits(amount1In));
                let formatAmount0Out = parseFloat(ethers.utils.formatUnits(amount0Out));
                let formatAmount1Out = parseFloat(ethers.utils.formatUnits(amount1Out));

                let tokenAmount;
                let quoteTokenAmount;

                if (formatAmount0In > 0 && formatAmount1In == 0) {
                    if (formatAmount0In > formatAmount1Out) {
                        isBuy = false;
                        tokenAmount = formatAmount0In;
                        quoteTokenAmount = formatAmount1Out;
                    } else {
                        isBuy = true;
                        tokenAmount = formatAmount1Out;
                        quoteTokenAmount = formatAmount0In;
                    }
                } else if (formatAmount0In == 0 && formatAmount1In > 0) {
                    if (formatAmount1In > formatAmount0Out) {
                        isBuy = false;
                        tokenAmount = formatAmount1In;
                        quoteTokenAmount = formatAmount0Out;
                    } else {
                        isBuy = true;
                        tokenAmount = formatAmount0Out;
                        quoteTokenAmount = formatAmount1In;
                    }
                }
                console.log('Swapped: ', event.transactionHash);
                const reserves = await contract.getReserves();
                const reserve0 = ethers.utils.formatUnits(reserves[0].toString());
                const reserve1 = ethers.utils.formatUnits(reserves[1].toString());
                const quoteTokenReserve = token0.toString().toLowerCase() == QUOTE_TOKEN_ADDRESS ? reserve0 : reserve1;
                const tokenReserve = token0.toString().toLowerCase() == tokenAddress ? reserve0 : reserve1;
                await sendAlert(isBuy, tokenAmount, quoteTokenAmount, event.transactionHash, tokenReserve, quoteTokenReserve, symbol, totalSupply.toString(), pairContractAddress);

            } catch (err) {
                console.log('error: ', err);
            }
        });
    }
}

async function sendAlert(isBuy, tokenAmount, quoteTokenAmount, txHash, tokenReserve, quoteTokenReserve, symbol, totalSupply, pairContractAddress) {
    const buySellMsg = isBuy ? 'Buy' : 'Sell';
    const inAmount = isBuy ? quoteTokenAmount : tokenAmount;
    const outAmount = isBuy ? tokenAmount : quoteTokenAmount;
    const inSymbol = isBuy ? QUOTE_TOKEN_SYMBOL : `$${symbol.toUpperCase()}`;
    const outSymbol = isBuy ? `$${symbol.toUpperCase()}` : QUOTE_TOKEN_SYMBOL;

    const response = await axios.get(`${DEXSCREENER_API_ENDPOINT}${QUOTE_TOKEN_DEXSCREENER_ADDRESS}`);
    const pair = response.data.pairs[0];
    const currentBtcPrice = parseFloat(pair.priceUsd);
    const quoteTokenPriceUsd = quoteTokenAmount * currentBtcPrice;

    const numberEmojies = parseInt(quoteTokenPriceUsd / 10);
    let emojiString = '';
    if (isBuy) {
        emojiString = BUY_EMOJI + BUY_EMOJI.repeat(numberEmojies);
    } else {
        emojiString = SELL_EMOJI + SELL_EMOJI.repeat(numberEmojies);
    }

    const tokenPrice = parseFloat(quoteTokenReserve) * currentBtcPrice / parseFloat(tokenReserve);
    const liquidity = parseFloat(quoteTokenReserve) * currentBtcPrice * 2;

    const marketCap = parseFloat(ethers.utils.formatUnits(totalSupply)) * tokenPrice;

    let message = '';

    if (isBuy) {
        message = `<b>New $${symbol.toUpperCase()} ${buySellMsg}!</b>\n\n` +
            `${emojiString}\n\n` +
            `<b>💲 Spent ${formatNumber(parseFloat(inAmount.toFixed(5)))} ${inSymbol} ($${quoteTokenPriceUsd.toFixed(2)})</b>\n\n` +
            `<b>💰 Got: ${formatNumber(parseFloat(outAmount.toFixed(5)))} ${outSymbol}</b>\n\n`;
    } else {
        message = `<b>New $${symbol.toUpperCase()} ${buySellMsg}!</b>\n\n` +
            `${emojiString}\n\n` +
            `<b>💲 Sold ${formatNumber(parseFloat(inAmount.toFixed(5)))} ${inSymbol}</b>\n\n` +
            `<b>💰 Got: ${formatNumber(parseFloat(outAmount.toFixed(5)))} ${outSymbol} ($${quoteTokenPriceUsd.toFixed(2)})</b>\n\n`;
    }

    message += `<b>🏷️ Price: $${tokenPrice.toFixed(12)}</b>\n\n` +
        `<b>🏦 Liquidity: $${formatNumber(liquidity.toFixed(2))}</b>\n\n` +
        `<b>📊 Market Cap: $${formatNumber(marketCap.toFixed(2))}</b>\n\n` +
        `<b>🔗 <a href='${TX_EXPLORER_URL}${txHash}'>Tx</a> | <a href='${CHART_URL}${pairContractAddress}'>Chart</a></b>\n\n`;

    const opts = {
        parse_mode: 'HTML',
    }
    if (quoteTokenPriceUsd >= THRESHOLD) {
        for (const chatId of CHAT_IDS) {
            await bot.sendMessage(chatId, message, opts);
        }
    }

}

bot.onText(/\/contract (.+)/, async (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        console.log(`unauthorized user ${msg.from.id}`);
        return; // Ignore messages from unauthorized users
    }
    const contractAddress = match[1].toLowerCase();
    try {
        await saveToJsonFile(contractAddress);
        await bot.sendMessage(msg.chat.id, 'Saved');
    } catch (err) {
        await bot.sendMessage(msg.chat.id, 'Invalid contract address');
    }

});

bot.onText(/\/del (.+)/, async (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        console.log(`unauthorized user ${msg.from.id}`);
        return; // Ignore messages from unauthorized users
    }
    const contractAddress = match[1].toLowerCase();
    try {
        await removeAddress(contractAddress);
        await bot.sendMessage(msg.chat.id, 'Removed');
    } catch (err) {
        await bot.sendMessage(msg.chat.id, 'Invalid contract address');
    }

});

main();