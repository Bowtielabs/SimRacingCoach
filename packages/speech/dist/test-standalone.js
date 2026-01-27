import say from 'say';
console.log('--- Iniciando prueba de voz con say.js ---');
const text = 'Esta es una prueba directa desde node usando say js con voz sabina desktop';
const voice = 'Microsoft Sabina Desktop';
const speed = 1.0;
console.log(`Hablando: "${text}" con voz "${voice}"`);
say.speak(text, voice, speed, (err) => {
    if (err) {
        console.error('Error en say.speak:', err);
        process.exit(1);
    }
    console.log('Voz completada con éxito.');
    process.exit(0);
});
//# sourceMappingURL=test-standalone.js.map