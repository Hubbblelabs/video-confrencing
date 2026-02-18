import { networkInterfaces } from 'os';

export function getLocalLanIp(): string {
    const nets = networkInterfaces();
    const results: string[] = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }

    // Prefer 192.168.x.x, then 10.x.x.x, then 172.x.x.x
    const preferred = results.find(ip => ip.startsWith('192.168.'));
    if (preferred) return preferred;

    return results[0] || '127.0.0.1';
}
