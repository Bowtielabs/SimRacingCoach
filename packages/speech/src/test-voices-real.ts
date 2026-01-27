import say from 'say';

const voices = ['Microsoft Sabina Desktop', 'Microsoft David Desktop', 'Microsoft Zira Desktop', 'Sabina', 'David', 'Zira'];

async function test() {
    for (const voice of voices) {
        console.log(`--- Probando voz: "${voice}" ---`);
        await new Promise((resolve) => {
            say.speak(`Esta es una prueba con la voz ${voice}`, voice, 1, (err) => {
                if (err) console.error(`Error con ${voice}:`, err);
                resolve(null);
            });
        });
    }
}

test();
