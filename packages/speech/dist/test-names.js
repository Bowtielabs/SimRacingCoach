import { exec } from 'child_process';
const script = `
  $paths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens",
    "HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens"
  )
  foreach ($path in $paths) {
    if (Test-Path $path) {
      Get-ItemProperty "$path\\*" | ForEach-Object {
        if ($_.Name) { $_.Name } else { $_.PSChildName }
      }
    }
  }
`.replace(/\n/g, ' ').trim();
const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`;
console.log('Running:', command);
exec(command, (err, stdout, stderr) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    const voices = stdout.replace(/\r/g, '').split('\n').map(v => v.trim()).filter(v => v.length > 0);
    const unique = [...new Set(voices)].sort();
    console.log('Voices:', unique);
});
//# sourceMappingURL=test-names.js.map