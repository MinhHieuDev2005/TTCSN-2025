export function connectChatStream(url, token, onChange, onStatus) {
    let stopped = false;
    let controller;
    let timer;
    let watchdog;
    let delay = 1000;
    const connect = async () => {
        clearTimeout(timer);
        if (stopped || controller || navigator.onLine === false) return;
        const request = new AbortController();
        controller = request;
        const touch = () => { clearTimeout(watchdog); watchdog = setTimeout(() => request.abort(), 40000); };
        touch();
        try {
            const response = await fetch(url, {headers: {Authorization: `Bearer ${token}`, Accept: 'text/event-stream'}, signal: request.signal});
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                onStatus('expired');
                return;
            }
            if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Chat stream unavailable');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (!stopped) {
                const {value, done} = await reader.read();
                if (done) break;
                touch();
                buffer += decoder.decode(value, {stream: true}).replace(/\r/g, '');
                let end;
                while ((end = buffer.indexOf('\n\n')) !== -1) {
                    const event = buffer.slice(0, end);
                    buffer = buffer.slice(end + 2);
                    const type = event.match(/^event:\s*(ready|change|read)$/m)?.[1];
                    if (type) {
                        delay = 1000;
                        onStatus('connected');
                        onChange(type);
                    }
                }
                if (buffer.length > 8192) throw new Error('Invalid chat stream');
            }
        } catch {
            if (!stopped) onStatus('reconnecting');
        } finally {
            clearTimeout(watchdog);
            request.abort();
            controller = null;
            if (!stopped) {
                onStatus('reconnecting');
                timer = setTimeout(connect, delay);
                delay = Math.min(delay * 2, 30000);
            }
        }
    };
    const online = () => { delay = 1000; connect(); };
    const offline = () => { controller?.abort(); onStatus('reconnecting'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    onStatus('reconnecting');
    connect();
    return () => {
        stopped = true;
        clearTimeout(timer);
        clearTimeout(watchdog);
        controller?.abort();
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
    };
}

export const mergeMessages = (previous, incoming) => [...new Map([...previous, ...incoming].map(message => [message.id, message])).values()].sort((left, right) => left.id - right.id);
