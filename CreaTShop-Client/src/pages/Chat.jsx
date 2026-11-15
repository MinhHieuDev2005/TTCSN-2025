import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import {FiArrowLeft, FiMessageCircle, FiSend, FiVolume2, FiVolumeX} from 'react-icons/fi';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {mergeMessages} from '../utils/chatStream';
import {useChatNotifications} from '../components/ChatNotifications';
import PropTypes from 'prop-types';

const endpoint = `${import.meta.env.VITE_API_URL}/chat`;

function Conversation({token, customerId, admin, refreshRef}) {
    const {t, formatDate} = useLanguage();
    const {markRead, setReading} = useChatNotifications();
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [sendError, setSendError] = useState('');
    const [sending, setSending] = useState(false);
    const [older, setOlder] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [away, setAway] = useState(false);
    const confirmedRead = useRef(0);
    const pending = useRef(null);
    const sendingRef = useRef(false);
    const scroll = useRef(null);
    const bottom = useRef(true);
    const active = useRef(true);
    const headers = useCallback(() => ({Authorization: `Bearer ${token}`}), [token]);

    useEffect(() => {
        active.current = true;
        const controller = new AbortController();
        let cursor = null;
        let running = false;
        let again = false;
        const refresh = async () => {
            if (running) { again = true; return; }
            running = true;
            try {
                do {
                    again = false;
                    const {data} = await axios.get(`${endpoint}/messages`, {headers: headers(), signal: controller.signal, timeout: 15000,
                        params: {customerId: admin ? customerId : undefined, afterId: cursor ?? undefined}});
                    if (controller.signal.aborted) return;
                    if (cursor === null) setOlder(data.length === 50);
                    setMessages(previous => mergeMessages(previous, data));
                    const initial = cursor === null;
                    cursor = Math.max(cursor || 0, ...data.map(message => message.id));
                    if (!initial && data.length === 50) again = true;
                    setError(false);
                } while (again && !controller.signal.aborted);
            } catch {
                if (!controller.signal.aborted) setError(true);
            } finally {
                running = false;
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        refreshRef.current = refresh;
        refresh();
        return () => { active.current = false; controller.abort(); refreshRef.current = () => {}; };
    }, [admin, customerId, headers, refreshRef]);

    const lastId = messages.at(-1)?.id;
    useEffect(() => {
        if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    }, [lastId]);
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
        });
        observer.observe(scroll.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        setReading(customerId, bottom.current);
        return () => setReading(null);
    }, [customerId, setReading]);

    useEffect(() => {
        const controller = new AbortController();
        const visible = new Set();
        let timer;
        let sending = false;
        let retry;
        const readVisible = async () => {
            if (document.hidden || sending || controller.signal.aborted) return;
            const lastReadId = Math.max(0, ...visible);
            if (lastReadId <= confirmedRead.current) return;
            sending = true;
            let succeeded = false;
            try {
                await markRead(customerId, lastReadId, controller.signal);
                if (!controller.signal.aborted) {
                    confirmedRead.current = Math.max(confirmedRead.current, lastReadId);
                    succeeded = true;
                }
            } catch {
                if (!controller.signal.aborted) retry = setTimeout(readVisible, 5000);
            } finally {
                sending = false;
                if (succeeded && Math.max(0, ...visible) > confirmedRead.current) observeRead();
            }
        };
        const observeRead = () => { clearTimeout(timer); timer = setTimeout(readVisible, 400); };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const id = Number(entry.target.dataset.chatIncoming);
                if (entry.isIntersecting) visible.add(id); else visible.delete(id);
            }
            observeRead();
        }, {root: scroll.current, threshold: 1});
        scroll.current.querySelectorAll('[data-chat-incoming]').forEach(element => observer.observe(element));
        document.addEventListener('visibilitychange', observeRead);
        return () => { controller.abort(); observer.disconnect(); clearTimeout(timer); clearTimeout(retry); document.removeEventListener('visibilitychange', observeRead); };
    }, [messages, customerId, markRead]);

    const loadOlder = async () => {
        if (loadingOlder || !messages.length) return;
        setLoadingOlder(true);
        const previousHeight = scroll.current?.scrollHeight || 0;
        try {
            const {data} = await axios.get(`${endpoint}/messages`, {headers: headers(), timeout: 15000,
                params: {customerId: admin ? customerId : undefined, beforeId: messages[0].id}});
            if (!active.current) return;
            setMessages(previous => mergeMessages(previous, data));
            setOlder(data.length === 50);
            setError(false);
            requestAnimationFrame(() => { if (scroll.current) scroll.current.scrollTop += scroll.current.scrollHeight - previousHeight; });
        } catch { if (active.current) setError(true); }
        finally { if (active.current) setLoadingOlder(false); }
    };

    const send = async event => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || text.length > 2000 || sendingRef.current) return;
        sendingRef.current = true;
        setSending(true);
        setSendError('');
        if (pending.current?.text !== text) pending.current = {text, clientMessageId: crypto.randomUUID()};
        try {
            const {data} = await axios.post(`${endpoint}/messages`, {...pending.current, customerId: admin ? customerId : undefined}, {headers: headers(), timeout: 15000});
            if (!active.current) return;
            bottom.current = true;
            setMessages(previous => mergeMessages(previous, [data]));
            setDraft('');
            pending.current = null;
            refreshRef.current();
        } catch (failure) {
            if (active.current) setSendError(failure.response?.status === 429 ? 'chat.rateLimit' : 'chat.sendError');
        } finally {
            sendingRef.current = false;
            if (active.current) setSending(false);
        }
    };

    return <div className='flex min-h-0 flex-1 flex-col'>
        {error && <div role='alert' className='flex items-center justify-between gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-900'>{t('chat.loadError')}<button type='button' onClick={() => refreshRef.current()} className='shrink-0 underline'>{t('chat.retry')}</button></div>}
        <div ref={scroll} role='log' aria-label={t('chat.history')} aria-live='polite' aria-relevant='additions' onScroll={() => { const panel = scroll.current; bottom.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 80; setReading(customerId, bottom.current); setAway(!bottom.current); }} className='min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6'>
            {older && <button type='button' onClick={loadOlder} disabled={loadingOlder} className='mx-auto block rounded-full border bg-white px-4 py-2 text-sm disabled:opacity-50'>{t('chat.older')}</button>}
            {loading ? <p role='status' className='text-center text-sm text-gray-500'>{t('chat.loading')}</p> : !messages.length && !error && <div className='mx-auto max-w-sm py-10 text-center text-gray-500'><FiMessageCircle aria-hidden='true' className='mx-auto mb-3 text-4xl text-blue-700' /><p>{t('chat.empty')}</p></div>}
            {messages.map(message => <div key={message.id} className={`flex ${message.fromShop === admin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${message.fromShop === admin ? 'rounded-br-sm bg-blue-700 text-white' : 'rounded-bl-sm border border-blue-100 bg-white text-gray-900'}`}>
                    <p className='mb-1 text-xs font-semibold opacity-80'>{message.fromShop ? t('chat.shop') : message.customerName}</p>
                    <p className='whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>{message.text}</p>
                    <time dateTime={message.sentAt} className='mt-2 block text-[11px] opacity-80'>{formatDate(message.sentAt)}</time>
                    {message.fromShop !== admin && <span data-chat-incoming={message.id} className='block h-px' />}
                </div>
            </div>)}
        </div>
        {away && <button type='button' onClick={() => { bottom.current = true; setReading(customerId, true); scroll.current.scrollTop = scroll.current.scrollHeight; setAway(false); }} className='border-t border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700'>{t('chat.jumpLatest')}</button>}
        <form onSubmit={send} className='border-t bg-white p-3 sm:p-4'>
            {sendError && <p role='alert' className='mb-2 text-sm text-red-700'>{t(sendError)}</p>}
            <label htmlFor='chat-message' className='sr-only'>{t('chat.input')}</label>
            <div className='flex items-end gap-2'>
                <textarea id='chat-message' value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} maxLength={2000} rows={2} placeholder={t('chat.input')} className='min-w-0 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700' />
                <button type='submit' disabled={sending || loading || !draft.trim()} aria-label={t('chat.send')} className='flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-700 p-3 text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40'><FiSend aria-hidden='true' /></button>
            </div>
            <p className='mt-1 text-right text-xs text-gray-500'>{draft.length}/2000</p>
        </form>
    </div>;
}

Conversation.propTypes = {token: PropTypes.string.isRequired, customerId: PropTypes.string.isRequired, admin: PropTypes.bool, refreshRef: PropTypes.object};
Chat.propTypes = {admin: PropTypes.bool};

export default function Chat({admin: adminView = false}) {
    const {user} = useAuth();
    const admin = adminView || Boolean(user.roles?.includes('ROLE_ADMIN'));
    const {t, formatDate} = useLanguage();
    const {status, version, sound, toggleSound} = useChatNotifications();
    const [searchParams, setSearchParams] = useSearchParams();
    const [threads, setThreads] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [inboxError, setInboxError] = useState(false);
    const selectedId = searchParams.get('customerId');
    const selected = selectedId ? threads.find(thread => thread.customerId === selectedId) || {customerId: selectedId, customerName: t('chat.customer')} : null;
    const refreshRef = useRef(() => {});
    const inboxRef = useRef(() => {});
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!admin) return;
        const controller = new AbortController();
        let running = false;
        let again = false;
        const refresh = async () => {
            if (running) { again = true; return; }
            running = true;
            try {
                do {
                    again = false;
                    const {data} = await axios.get(`${endpoint}/threads`, {headers: {Authorization: `Bearer ${user.token}`}, params: {page}, signal: controller.signal, timeout: 15000});
                    if (controller.signal.aborted) return;
                    setThreads(data.items);
                    setHasMore(data.hasMore);
                    setInboxError(false);
                } while (again);
            } catch { if (!controller.signal.aborted) setInboxError(true); }
            finally { running = false; }
        };
        inboxRef.current = refresh;
        refresh();
        return () => { controller.abort(); inboxRef.current = () => {}; };
    }, [admin, user.token, page, retry]);

    useEffect(() => {
        refreshRef.current();
        inboxRef.current();
    }, [version]);

    const customer = admin ? selected?.customerId : user.idUser;
    return <section className={`mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${adminView ? 'h-[min(760px,85dvh)] min-h-[420px]' : 'min-h-0 flex-1'}`}>
        <header className='flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-4 sm:px-6'>
            <div><h1 className='text-xl font-bold text-gray-900'>{t(admin ? 'chat.inbox' : 'chat.title')}</h1><p className='mt-1 text-xs text-gray-600'>{t('chat.responseNote')}</p></div>
            <div className='flex items-center gap-3'>
                <p role='status' className={`flex shrink-0 items-center gap-2 text-xs ${status === 'connected' ? 'text-emerald-700' : 'text-amber-800'}`}><span aria-hidden='true' className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-600' : 'bg-amber-500'}`} />{t(status === 'expired' ? 'chat.expiredStatus' : `chat.${status}`)}</p>
                <button type='button' onClick={toggleSound} aria-pressed={sound} aria-label={t(sound ? 'chat.soundOff' : 'chat.soundOn')} title={t(sound ? 'chat.soundOff' : 'chat.soundOn')} className='flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-700 hover:bg-blue-50'>{sound ? <FiVolume2 aria-hidden='true' /> : <FiVolumeX aria-hidden='true' />}</button>
            </div>
        </header>
        {status === 'expired' ? <p role='alert' className='p-6'>{t('chat.expired')} <Link to='/login' className='text-blue-700 underline'>{t('chat.login')}</Link></p> : <div className='flex min-h-0 flex-1'>
            {admin && <aside aria-label={t('chat.inbox')} className={`${selected ? 'hidden md:flex' : 'flex'} w-full flex-col overflow-y-auto border-r md:w-72 md:shrink-0`}>
                {inboxError && <button type='button' onClick={() => setRetry(value => value + 1)} className='bg-amber-50 p-4 text-sm text-amber-900'>{t('chat.loadError')} {t('chat.retry')}</button>}
                {!threads.length && !inboxError && <p className='p-5 text-sm text-gray-500'>{t('chat.noThreads')}</p>}
                {threads.map(thread => <button key={thread.customerId} type='button' onClick={() => setSearchParams({customerId: thread.customerId})} aria-pressed={thread.customerId === selected?.customerId} className={`border-b p-4 text-left hover:bg-blue-50 ${thread.customerId === selected?.customerId ? 'border-l-4 border-l-blue-700 bg-blue-50' : ''}`}>
                    <span className='flex items-center justify-between gap-2'><span className={`truncate ${thread.unreadCount > 0 ? 'font-bold text-blue-800' : 'font-medium'}`}>{thread.customerName}</span>{thread.unreadCount > 0 && <span aria-label={t('chat.unreadMessages', {count: thread.unreadCount})} className='shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-bold text-white'>{thread.unreadCount > 99 ? '99+' : thread.unreadCount}</span>}</span><span className='mt-1 block truncate text-sm text-gray-600'>{thread.fromShop ? `${t('chat.shop')}: ` : ''}{thread.text}</span><span className='mt-2 block text-xs text-gray-500'>{formatDate(thread.sentAt)}</span>
                </button>)}
                <div className='mt-auto flex items-center justify-between gap-2 p-3 text-sm'><button type='button' disabled={page === 0} onClick={() => setPage(value => value - 1)} className='min-h-11 disabled:opacity-40'>{t('chat.previous')}</button><span>{page + 1}</span><button type='button' disabled={!hasMore} onClick={() => setPage(value => value + 1)} className='min-h-11 disabled:opacity-40'>{t('chat.next')}</button></div>
            </aside>}
            <div className={`${admin && !selected ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col`}>
                {admin && selected && <div className='flex items-center gap-3 border-b px-4 py-2'><button type='button' aria-label={t('chat.back')} onClick={() => setSearchParams({})} className='min-h-11 min-w-11 md:hidden'><FiArrowLeft aria-hidden='true' /></button><h2 className='truncate font-semibold'>{selected.customerName}</h2></div>}
                {customer ? <Conversation key={`${user.token}:${customer}`} token={user.token} customerId={customer} admin={admin} refreshRef={refreshRef} /> : <p className='m-auto p-6 text-center text-gray-500'>{t('chat.choose')}</p>}
            </div>
        </div>}
    </section>;
}
