 import express, { Request, Response, Application } from 'express';
import { startSock, sock } from './example'; // Asegúrate de que la ruta a 'example' es correcta
// import { preguntarIA } from './Api'; // Importa la función desde 'api.ts'
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const app: Application = express();

// Middleware para parsear el cuerpo de la solicitud como JSON
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

let sockInstance;
startSock().then(connection => {
    sockInstance = connection;

    // Escuchar eventos de mensajes recibidos
    sockInstance.ev.on('messages.upsert', async (messageUpdate) => {
        console.log('New message received:', messageUpdate);
        if (messageUpdate.type === 'notify') {
            for (const msg of messageUpdate.messages) {
                if (!msg.key.fromMe) {
                    const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
                    if (typeof messageContent === 'string') {
                        console.log('Message content:', messageContent);

                        // Realiza una solicitud POST a la URL especificada con el contenido del mensaje
                        // try {
                        //     // const response = await preguntarIA(messageContent);
                        //     console.log('Response from external API:', response);

                        //     if (typeof response === 'string') {
                        //         const sentMsg = await sockInstance.sendMessage(msg.key.remoteJid!, { text: response });
                        //         console.log('Message sent:', sentMsg);
                        //     } else {
                        //         console.error('Response from external API is not a string:', response);
                        //     }
                        // } catch (error) {
                        //     console.error('Error posting data to external API:', error);
                        // }
                    } else {
                        console.error('Received message content is not a string:', messageContent);
                    }
                }
            }
        }
    });
}).catch(err => console.error('Failed to start socket:', err));

// Definir la ruta POST para enviar mensajes
app.post('/sendMessage', async (req: Request, res: Response) => {
    const { number, message } = req.body;
    const id = `${number}@s.whatsapp.net`;
    try {
        if (!sockInstance) {
            throw new Error('WhatsApp socket not initialized');
        }
        const sentMsg = await sockInstance.sendMessage(id, { text: message });
        // const mensaje = await sockInstance.sendMessage(id, { 
        //     video: fs.readFileSync("Media/ma_gif.mp4"), 
        //     caption: req.params.caption,
        //     gifPlayback: true
        // });
        res.status(200).send(`Message sent: ${JSON.stringify(sentMsg)}`);
    } catch (error) {
        res.status(500).send(`Error sending message: ${error.message}`);
    }
});
app.post('/sendMessageWithMedia/:number/:caption', upload.single('file'), async (req: express.Request, res: express.Response) => {
    const { number, caption } = req.params;
    const file = req.file;
    const id = `${number}@s.whatsapp.net`;

    try {
        if (!sockInstance) {
            throw new Error('WhatsApp socket not initialized');
        }

        if (!file) {
            throw new Error('No file uploaded');
        }

        const fileType = path.extname(file.originalname).toLowerCase();
        let mediaType;
        let messageContent: any = { caption: caption };

        switch (fileType) {
            case '.jpg':
            case '.jpeg':
            case '.png':
                mediaType = 'image';
                messageContent.image = { url: file.path };
                break;
            case '.mp4':
            case '.gif':
                mediaType = 'video';
                messageContent.video = { url: file.path };
                if (fileType === '.gif') {
                    messageContent.gifPlayback = true;
                }
                break;
            case '.mp3':
            case '.ogg':
                mediaType = 'audio';
                messageContent.audio = { url: file.path };
                break;
            default:
                mediaType = 'document';
                messageContent.document = { url: file.path };
        }

        const sentMsg = await sockInstance.sendMessage(id, messageContent);

        // Eliminar el archivo después de enviarlo
        fs.unlinkSync(file.path);

        res.status(200).send(`Message sent with ${mediaType}: ${JSON.stringify(sentMsg)}`);
    } catch (error) {
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        res.status(500).send(`Error sending message: ${error.message}`);
    }
});


// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
