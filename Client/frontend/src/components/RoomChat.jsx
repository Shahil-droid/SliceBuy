import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Send, MessageCircle } from 'lucide-react';
import './RoomChat.css';

const RoomChat = ({ roomCode }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);
    // Track IDs we already have, to avoid duplicates
    const knownIdsRef = useRef(new Set());

    // ── Scroll to bottom ──────────────────────────────────────
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // ── Full fetch (initial load + periodic full refresh) ─────
    const fetchAllMessages = async () => {
        try {
            const res = await api.get(`/orders/rooms/${roomCode}/messages/`);
            const data = res.data || [];
            // Replace entire state with server truth
            knownIdsRef.current = new Set(data.map(m => m.id));
            setMessages(data);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    // ── Poll for new messages only ────────────────────────────
    const pollNewMessages = async () => {
        try {
            // Find the highest known ID
            const maxId = knownIdsRef.current.size > 0
                ? Math.max(...knownIdsRef.current)
                : null;

            let url = `/orders/rooms/${roomCode}/messages/`;
            if (maxId) url += `?after=${maxId}`;

            const res = await api.get(url);
            const newMsgs = (res.data || []).filter(m => !knownIdsRef.current.has(m.id));

            if (newMsgs.length > 0) {
                for (const m of newMsgs) knownIdsRef.current.add(m.id);
                setMessages(prev => [...prev, ...newMsgs]);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            // On auth error, do a full refetch on next cycle
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.warn('Chat poll auth error — will retry on next cycle');
            }
        }
    };

    // ── Lifecycle: initial load + polling ──────────────────────
    useEffect(() => {
        // Full load on mount
        fetchAllMessages().then(() => {
            setTimeout(scrollToBottom, 200);
        });

        // Poll every 2 seconds for new messages
        pollRef.current = setInterval(pollNewMessages, 2000);

        return () => {
            clearInterval(pollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomCode]);

    // ── Send message ──────────────────────────────────────────
    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        setSending(true);
        try {
            const res = await api.post(`/orders/rooms/${roomCode}/messages/`, {
                text: trimmed,
            });
            const sentMsg = res.data;

            // Only add if not already known (prevents duplicates)
            if (!knownIdsRef.current.has(sentMsg.id)) {
                knownIdsRef.current.add(sentMsg.id);
                setMessages(prev => [...prev, sentMsg]);
            }

            setText('');
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Failed to send:', err);
        } finally {
            setSending(false);
        }
    };

    // ── Format time ───────────────────────────────────────────
    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="room-chat">
            <div className="room-chat__header">
                <MessageCircle size={18} />
                <span>Room Chat</span>
                <span className="room-chat__count">{messages.length}</span>
            </div>

            <div className="room-chat__messages">
                {messages.length === 0 ? (
                    <div className="room-chat__empty">
                        <MessageCircle size={32} />
                        <p>No messages yet. Say hi! 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`room-chat__bubble ${isMe ? 'room-chat__bubble--mine' : ''}`}
                            >
                                {!isMe && (
                                    <div className="room-chat__bubble-avatar">
                                        {msg.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="room-chat__bubble-content">
                                    {!isMe && (
                                        <span className="room-chat__bubble-name">{msg.username}</span>
                                    )}
                                    <p className="room-chat__bubble-text">{msg.text}</p>
                                    <span className="room-chat__bubble-time">{formatTime(msg.created_at)}</span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="room-chat__input" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={1000}
                />
                <button type="submit" disabled={!text.trim() || sending} title="Send">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default RoomChat;