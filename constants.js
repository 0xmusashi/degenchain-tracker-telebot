require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL = process.env.RPC_URL;
const FACTORY_CONTRACT_ADDRESS = process.env.FACTORY_CONTRACT_ADDRESS;
const QUOTE_TOKEN_ADDRESS = process.env.QUOTE_TOKEN_ADDRESS.toString().toLowerCase();
const QUOTE_TOKEN_SYMBOL = '$WDEGEN';

const DEXSCREENER_API_ENDPOINT = process.env.DEXSCREENER_API_ENDPOINT;

const TX_EXPLORER_URL = 'https://explorer.degen.tips/tx/';
const CHART_URL = 'https://dexscreener.com/degenchain/';
const QUOTE_TOKEN_DEXSCREENER_ADDRESS = '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed';

const BASE_BUY_EMOJIES = '👾👾👾👾👾👾👾👾👾👾';
const BASE_SELL_EMOJIES = '🚗🚗🚗🚗🚗🚗🚗🚗🚗🚗';
const BUY_EMOJI = '👾';
const SELL_EMOJI = '🚗';

const CHAT_IDS = [1559803968, 2127544523, -1002020318135];
const ADMIN_IDS = [1559803968, 2127544523];

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

module.exports = {
    TELEGRAM_BOT_TOKEN,
    RPC_URL,
    FACTORY_CONTRACT_ADDRESS,
    QUOTE_TOKEN_ADDRESS,
    QUOTE_TOKEN_SYMBOL,
    DEXSCREENER_API_ENDPOINT,
    TX_EXPLORER_URL,
    QUOTE_TOKEN_DEXSCREENER_ADDRESS,
    BASE_BUY_EMOJIES,
    BASE_SELL_EMOJIES,
    BUY_EMOJI,
    SELL_EMOJI,
    CHAT_IDS,
    ADMIN_IDS,
    ADDRESS_ZERO,
    CHART_URL
}