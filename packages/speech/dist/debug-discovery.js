import { exec } from 'child_process';
const psCommand = 'Get-ChildItem -Path HKLM:\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens, HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Speech\\Voices\\Tokens, HKCU:\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens, HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens -ErrorAction SilentlyContinue | ForEach-Object { $n = (Get-ItemProperty $_.PSPath).Name; if (!$n) { $n = $_.PSChildName }; $n }';
const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`;
console.log('Running command:', command);
exec(command, (err, stdout, stderr) => {
    if (err) {
        console.error('Error:', err);
        console.error('Stderr:', stderr);
        return;
    }
    const rawVoices = stdout
        .replace(/\r/g, '')
        .split('\n')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    const voices = [...new Set(rawVoices)].sort();
    console.log(`Discovered ${voices.length} unique voices:`);
    voices.forEach(v => console.log(` - ${v}`));
});
//# sourceMappingURL=debug-discovery.js.map