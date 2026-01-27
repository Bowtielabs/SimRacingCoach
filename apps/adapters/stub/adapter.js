const sim = process.argv[2] || 'other';
const details = 'Not implemented yet';

function emitStatus() {
  const payload = {
    type: 'status',
    state: 'waiting',
    sim,
    details,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

emitStatus();
setInterval(emitStatus, 2000);
