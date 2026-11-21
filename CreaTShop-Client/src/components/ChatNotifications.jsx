import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {FiMessageCircle, FiX} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {connectChatStream} from '../utils/chatStream';
import PropTypes from 'prop-types';

const ChatContext = createContext(null);
const endpoint = `${import.meta.env.VITE_API_URL}/chat`;

export const useChatNotifications = () => useContext(ChatContext);

function ChatSession({user, children}) {
    const {t} = useLanguage();
    const [status, setStatus] = useState('reconnecting');
    const [unread, setUnread] = useState({messageCount: 0, threadCount: 0});
    const [version, setVersion] = useState(0);
    const [sound, setSound] = useState(false);
    const soundRef = useRef(false);
    const audio = useRef(null);
    const view = useRef(null);
    const refreshRef = useRef(() => {});
    const textRef = useRef(t);
    const title = useRef(document.title.replace(/^\((?:\d+|99\+)\) /, ''));
    const admin = Boolean(user?.roles?.includes('ROLE_ADMIN'));
    const count = admin ? unread.threadCount : unread.messageCount;
    useEffect(() => { textRef.current = t; }, [t]);

    useEffect(() => {
        const baseTitle = title.current;
        document.title = count ? `(${count > 99 ? '99+' : count}) ${baseTitle}` : baseTitle;
        return () => { document.title = baseTitle; };
    }, [count]);

    useEffect(() => {
        if (!user?.token) return;
        const controller = new AbortController();
        let running = false;
        let again = false;
        let announceNext = false;
        let previous = null;
        let lastSound = 0;
        const refresh = async (announce = false) => {
            announceNext ||= announce;
            if (running) { again = true; return; }
            running = true;
            try {
                do {
                    again = false;
                    const shouldAnnounce = announceNext;
                    announceNext = false;
                    const {data} = await axios.get(`${endpoint}/unread`, {headers: {Authorization: `Bearer ${user.token}`}, signal: controller.signal, timeout: 15000});
                    if (controller.signal.aborted) return;
                    if (!Number.isSafeInteger(data.messageCount) || data.messageCount < 0 || !Number.isSafeInteger(data.threadCount) || data.threadCount < 0) throw new Error('Invalid unread count');
                    if (data.messageCount === 0) toast.remove('chat-new-message');
                    const latest = data.latestIncoming;
                    const reading = !document.hidden && view.current?.customerId === latest?.customerId && view.current?.atBottom;
                    if (shouldAnnounce && previous && latest?.id > (previous.latestIncoming?.id || 0) && data.messageCount > 0 && !reading) {
                        const destination = admin ? `/admin/chat?${new URLSearchParams({customerId: latest.customerId})}` : '/chat';
                        toast.custom(notification => <div role='status' className='flex w-80 max-w-[calc(100vw-32px)] items-center gap-3 rounded-xl border border-blue-200 bg-white p-4 text-gray-900 shadow-lg'>
                            <FiMessageCircle aria-hidden='true' className='shrink-0 text-2xl text-blue-700' />
                            <Link to={destination} onClick={() => toast.dismiss(notification.id)} className='min-w-0 flex-1 rounded focus-visible:outline-blue-700'>
                                <span className='block truncate font-semibold'>{admin ? latest.customerName : textRef.current('chat.shop')}</span>
                                <span className='block text-sm text-gray-600'>{textRef.current('chat.newMessage')}</span>
                            </Link>
                            <button type='button' onClick={() => toast.dismiss(notification.id)} aria-label={textRef.current('chat.dismissNotification')} className='flex min-h-9 min-w-9 items-center justify-center rounded hover:bg-blue-50'><FiX aria-hidden='true' /></button>
                        </div>, {id: 'chat-new-message', duration: 6000, position: 'top-right'});
                        try {
                            if (soundRef.current && audio.current?.state === 'running' && Date.now() - lastSound > 3000) {
                                lastSound = Date.now();
                                const oscillator = audio.current.createOscillator();
                                const gain = audio.current.createGain();
                                oscillator.frequency.value = 660;
                                gain.gain.setValueAtTime(0.08, audio.current.currentTime);
                                gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.18);
                                oscillator.connect(gain); gain.connect(audio.current.destination);
                                oscillator.start(); oscillator.stop(audio.current.currentTime + 0.2);
                            }
                        } catch { soundRef.current = false; setSound(false); }
                    }
                    previous = data;
                    setUnread(data);
                } while (again && !controller.signal.aborted);
            } catch {
                if (!controller.signal.aborted) setStatus(current => current === 'expired' ? current : 'reconnecting');
            } finally { running = false; }
        };
        refreshRef.current = refresh;
        refresh();
        const stop = connectChatStream(`${endpoint}/events`, user.token, type => {
            setVersion(current => current + 1);
            refresh(type === 'change');
        }, setStatus);
        const visible = () => { if (!document.hidden) refresh(); };
        document.addEventListener('visibilitychange', visible);
        return () => {
            controller.abort(); stop(); refreshRef.current = () => {};
            document.removeEventListener('visibilitychange', visible);
            toast.remove('chat-new-message');
        };
    }, [user?.token, admin]);

    useEffect(() => () => { audio.current?.close(); }, []);
    const toggleSound = async () => {
        if (soundRef.current) { soundRef.current = false; setSound(false); return; }
        try {
            const Audio = window.AudioContext || window.webkitAudioContext;
            if (!Audio) return;
            audio.current ||= new Audio();
            await audio.current.resume();
            soundRef.current = true;
            setSound(true);
        } catch { soundRef.current = false; setSound(false); }
    };
    const setReading = useCallback((customerId, atBottom = false) => { view.current = customerId ? {customerId, atBottom} : null; }, []);
    const refresh = useCallback(() => refreshRef.current(), []);
    const markRead = useCallback(async (customerId, lastReadId, signal) => {
        await axios.put(`${endpoint}/read`, {customerId: admin ? customerId : undefined, lastReadId}, {
            headers: {Authorization: `Bearer ${user?.token}`}, signal, timeout: 15000,
        });
        if (!signal?.aborted) refreshRef.current();
    }, [admin, user?.token]);

    return <ChatContext.Provider value={{status, unread, count, version, refresh, markRead, setReading, sound, toggleSound}}>{children}</ChatContext.Provider>;
}

export function ChatProvider({children}) {
    const {user} = useAuth();
    return <ChatSession key={user?.token || 'anonymous'} user={user}>{children}</ChatSession>;
}

ChatSession.propTypes = {user: PropTypes.object, children: PropTypes.node};
ChatProvider.propTypes = {children: PropTypes.node};
