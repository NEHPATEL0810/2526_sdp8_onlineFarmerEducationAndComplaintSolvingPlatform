import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Plus, Trash2, Menu, X, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Chatbot() {
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);
    const { isAuthenticated, user } = useAuth();

    const [chatSessions, setChatSessions] = useState([]);        // list of {session_id, title, last_message, updated_at}
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [expandedSources, setExpandedSources] = useState({});

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    // ─── Load all sessions from backend on mount ─────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get(`${API}/chat/sessions/`, { headers: authHeaders() })
            .then(res => {
                setChatSessions(res.data);
                // Auto-select most recent session if any
                if (res.data.length > 0) {
                    loadSession(res.data[0].session_id);
                }
            })
            .catch(() => {/* ignore – user might have no sessions yet */ });
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    // ─── Load messages for a session from backend ─────────────────────────────
    const loadSession = useCallback(async (sessionId) => {
        setCurrentSessionId(sessionId);
        setMessages([]);
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setMessages(res.data.messages);
        } catch {
            setMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    // ─── New chat ──────────────────────────────────────────────────────────────
    const handleNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
    }, []);

    // ─── Switch session ────────────────────────────────────────────────────────
    const handleSwitchChat = useCallback((sessionId) => {
        if (sessionId === currentSessionId) return;
        loadSession(sessionId);
    }, [currentSessionId, loadSession]);

    // ─── Delete session ────────────────────────────────────────────────────────
    const handleDeleteChat = useCallback(async (sessionId, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch {/* ignore */ }
    }, [currentSessionId]);

    // ─── Copy message ──────────────────────────────────────────────────────────
    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }, []);

    // ─── Send message ──────────────────────────────────────────────────────────
    const handleSendMessage = useCallback(async ({ input, attachments: msgAttachments }) => {
        if (!input.trim() && msgAttachments.length === 0) return;

        const tempId = `msg-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: tempId,
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
        }]);
        setIsGenerating(true);

        try {
            const res = await axios.post(`${API}/chat/`, {
                question: input,
                session_id: currentSessionId,
            }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

            const { answer, retrieved, confidence, session_id, title } = res.data;

            // If this was a brand-new chat (no session yet), add it to the sidebar
            if (!currentSessionId) {
                setCurrentSessionId(session_id);
                setChatSessions(prev => [{
                    session_id: session_id,
                    title: title || input.substring(0, 60),
                    last_message: answer.substring(0, 80),
                    updated_at: new Date().toISOString(),
                }, ...prev]);
            } else {
                // Update title + last_message for existing session
                setChatSessions(prev => prev.map(s =>
                    s.session_id === session_id
                        ? { ...s, last_message: answer.substring(0, 80), updated_at: new Date().toISOString() }
                        : s
                ));
            }

            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: answer,
                retrieved,
                confidence,
                timestamp: new Date().toISOString(),
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                isError: true,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsGenerating(false);
        }
    }, [currentSessionId]);

    const handleStopGenerating = useCallback(() => setIsGenerating(false), []);

    if (!isAuthenticated) return null;

    return (
        <>
            <Navbar />
            <div style={{ paddingTop: '72px', height: '100vh', backgroundColor: '#ffffc5', display: 'flex', overflow: 'hidden' }}>

                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="w-70 bg-white border-r-2 flex flex-col"
                            style={{ borderColor: '#4ade80', height: 'calc(100vh - 72px)' }}
                        >
                            {/* New Chat button */}
                            <div className="p-4 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Plus size={20} /> New Chat
                                </button>
                            </div>

                            {/* Chat History list */}
                            <div className="flex-1 overflow-y-auto p-2">
                                {chatSessions.length === 0 && (
                                    <p className="text-xs text-center mt-6" style={{ color: '#9ca3af' }}>
                                        No previous chats
                                    </p>
                                )}
                                {chatSessions.map(chat => (
                                    <motion.div
                                        key={chat.session_id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSwitchChat(chat.session_id)}
                                        className="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: chat.session_id === currentSessionId ? '#f0fdf4' : 'transparent',
                                            border: chat.session_id === currentSessionId ? '1px solid #4ade80' : '1px solid transparent',
                                        }}
                                        onMouseEnter={e => {
                                            if (chat.session_id !== currentSessionId)
                                                e.currentTarget.style.backgroundColor = '#f9fafb';
                                        }}
                                        onMouseLeave={e => {
                                            if (chat.session_id !== currentSessionId)
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare size={16} className="mt-1 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" style={{ color: '#1f2937' }}>
                                                    {chat.title}
                                                </div>
                                                {chat.last_message && (
                                                    <div className="text-xs truncate mt-1" style={{ color: '#6b7280' }}>
                                                        {chat.last_message}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={e => handleDeleteChat(chat.session_id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                                                style={{ color: '#dc2626' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* User info at bottom */}
                            <div className="p-4 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                                        style={{ backgroundColor: '#16a34a' }}>
                                        {user?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: '#1f2937' }}>
                                        {user?.username || 'User'}
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main Chat Area ────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 bg-white border-b-2" style={{ borderColor: '#e5e7eb' }}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="text-lg font-semibold" style={{ color: '#15803d' }}>
                            🌾 FarmEasy AI Assistant
                        </h2>
                    </div>

                    {/* Messages */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            backgroundColor: '#ffffc5',
                            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(74,222,128,0.05) 0%,transparent 50%), radial-gradient(circle at 80% 70%, rgba(22,163,74,0.05) 0%,transparent 50%)',
                        }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-6">

                            {/* Loading spinner */}
                            {loadingHistory && (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
                                </div>
                            )}

                            {/* Empty state */}
                            {!loadingHistory && messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <div>
                                        <div className="text-8xl mb-6">🌱</div>
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#15803d' }}>
                                            Welcome, {user?.username || 'Farmer'}!
                                        </h3>
                                        <p className="text-gray-700 max-w-md mx-auto">
                                            Ask me anything about crops, pest management, soil health, or farming best practices!
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Messages list */}
                            {!loadingHistory && messages.length > 0 && (
                                <div className="space-y-6 pb-4">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`group relative max-w-[85%] ${message.role === 'user'
                                                        ? 'rounded-3xl px-5 py-3 shadow-md'
                                                        : 'rounded-2xl px-5 py-4 shadow-lg'}`}
                                                    style={{
                                                        backgroundColor: message.role === 'user' ? '#16a34a'
                                                            : message.isError ? '#fee2e2' : '#ffffff',
                                                        color: message.role === 'user' ? '#ffffff' : '#1f2937',
                                                        border: message.role === 'assistant' && !message.isError ? '1px solid #e5e7eb' : 'none',
                                                    }}
                                                >
                                                    {/* AI header: name + confidence badge */}
                                                    {message.role === 'assistant' && !message.isError && (
                                                        <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                                                                    <span className="text-sm">🤖</span>
                                                                </div>
                                                                <span className="font-semibold text-sm" style={{ color: '#15803d' }}>
                                                                    FarmEasy AI
                                                                </span>
                                                            </div>
                                                            {message.confidence && (
                                                                <span
                                                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                    style={{
                                                                        backgroundColor: message.confidence === 'HIGH' ? '#dcfce7'
                                                                            : message.confidence === 'MEDIUM' ? '#fef9c3' : '#fee2e2',
                                                                        color: message.confidence === 'HIGH' ? '#15803d'
                                                                            : message.confidence === 'MEDIUM' ? '#854d0e' : '#991b1b',
                                                                    }}
                                                                >
                                                                    {message.confidence === 'HIGH' ? '✓ High Confidence'
                                                                        : message.confidence === 'MEDIUM' ? '~ Medium Confidence'
                                                                            : '⚠ Low Confidence'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Message text */}
                                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                        {message.content}
                                                    </div>

                                                    {/* Image attachments */}
                                                    {message.attachments && message.attachments.length > 0 && (
                                                        <div className="mt-3 flex gap-2 flex-wrap">
                                                            {message.attachments.map((att, idx) => (
                                                                <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border shadow-sm">
                                                                    {att.contentType?.startsWith('image/') ? (
                                                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs p-2 text-center">
                                                                            {att.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* ── Collapsible Sources panel ──────────────── */}
                                                    {message.role === 'assistant' && !message.isError &&
                                                        message.retrieved && message.retrieved.length > 0 && (
                                                            <div className="mt-3" style={{ borderTop: '1px solid #f0fdf4', paddingTop: '10px' }}>
                                                                <button
                                                                    onClick={() => setExpandedSources(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                                                                    className="flex items-center gap-1 text-xs font-medium"
                                                                    style={{ color: 'white' }}
                                                                >
                                                                    <ChevronDown
                                                                        size={14}
                                                                        style={{
                                                                            transform: expandedSources[message.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                            transition: 'transform 0.2s',
                                                                        }}
                                                                    />
                                                                    {expandedSources[message.id] ? 'Hide' : 'Show'} Sources ({message.retrieved.length})
                                                                </button>
                                                                {expandedSources[message.id] && (
                                                                    <div className="mt-2 space-y-2">
                                                                        {message.retrieved.map((src, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="text-xs p-2 rounded-lg"
                                                                                style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                                                            >
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className="font-semibold" style={{ color: '#15803d' }}>
                                                                                        📄 {src.source}
                                                                                    </span>
                                                                                    <span
                                                                                        className="text-xs px-1.5 py-0.5 rounded"
                                                                                        style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                                                                                    >
                                                                                        {src.category}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-gray-500">
                                                                                    Relevance: <strong>{(src.score * 100).toFixed(0)}%</strong>
                                                                                </div>
                                                                                <div className="mt-1 text-gray-600 line-clamp-2">{src.text}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* Timestamp + copy */}
                                                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <div className="text-xs opacity-60">
                                                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {message.role === 'assistant' && !message.isError && (
                                                            <button
                                                                onClick={() => handleCopyMessage(message.content, message.id)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100"
                                                                title="Copy message"
                                                            >
                                                                {copiedMessageId === message.id
                                                                    ? <Check size={14} style={{ color: 'white' }} />
                                                                    : <Copy size={14} style={{ color: 'white' }} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Typing indicator */}
                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="rounded-2xl px-5 py-4 shadow-lg bg-white">
                                                <div className="flex gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="bg-white border-t-2 p-4" style={{ borderColor: '#e5e7eb' }}>
                        <div className="max-w-4xl mx-auto">
                            <PureMultimodalInput
                                chatId={currentSessionId || 'new'}
                                messages={messages}
                                attachments={attachments}
                                setAttachments={setAttachments}
                                onSendMessage={handleSendMessage}
                                onStopGenerating={handleStopGenerating}
                                isGenerating={isGenerating}
                                canSend={!isGenerating}
                                selectedVisibilityType="private"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
