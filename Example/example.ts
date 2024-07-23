import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import makeWASocket, {
    delay, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, makeInMemoryStore, useMultiFileAuthState
} from '../src';
import MAIN_LOGGER from '../src/Utils/logger';
import open from 'open';
import fs from 'fs';

const logger = MAIN_LOGGER.child({});
logger.level = 'trace';

const useStore = !process.argv.includes('--no-store');
const doReplies = !process.argv.includes('--no-reply');
const usePairingCode = process.argv.includes('--use-pairing-code');
const useMobile = process.argv.includes('--mobile');

const msgRetryCounterCache = new NodeCache();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const store = useStore ? makeInMemoryStore({ logger }) : undefined;
store?.readFromFile('./baileys_store_multi.json');
setInterval(() => {
    store?.writeToFile('./baileys_store_multi.json');
}, 10_000);

 export let sock;

export const startSock = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !usePairingCode,
        mobile: useMobile,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        getMessage,
    });

    store?.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            console.error('Connection closed. Not attempting to reconnect.');
            if ((lastDisconnect?.error as Boom)?.output?.statusCode === DisconnectReason.loggedOut) {
                console.log('Logged out from WhatsApp.');
            }
        } else if (connection === 'open') {
            console.log('Opened connection');
        }
    });

    return sock;

    async function getMessage(key) {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
        }
        // return proto.Message.fromObject({});
    }
};
