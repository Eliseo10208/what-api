import axios from 'axios';

export const preguntarIA = async (mensaje: string): Promise<string> => {
    const url = 'http://3.13.52.255:8000/sims_help';
    const data = {
        username: '1237',
        message: mensaje
    };

    try {
        const response = await axios.post(url, data);
        console.log('Response:', response.data);
        // Asegúrate de devolver solo la propiedad `reply`
        return response.data.reply;
    } catch (error) {
        console.error('Error posting data:', error);
        throw error; // Para manejar el error correctamente
    }
};
