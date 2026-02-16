import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Plus, Trash2, Menu, X, Copy, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';

export default function Chatbot() {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const [currentChatId, setCurrentChatId] = useState(() => {
        const storedChatId = localStorage.getItem('farmEasyCurrentChatId');
        if (storedChatId) return storedChatId;
        const newChatId = `chat-${Date.now()}`;
        localStorage.setItem('farmEasyCurrentChatId', newChatId);
        return newChatId;
    });

    const [chatSessions, setChatSessions] = useState(() => {
        const stored = localStorage.getItem('farmEasyChatSessions');
        if (stored) return JSON.parse(stored);
        const initial = [{
            id: currentChatId,
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            lastMessage: '',
        }];
        localStorage.setItem('farmEasyChatSessions', JSON.stringify(initial));
        return initial;
    });

    const [messages, setMessages] = useState(() => {
        const storedMessages = localStorage.getItem(`farmEasyMessages-${currentChatId}`);
        return storedMessages ? JSON.parse(storedMessages) : [];
    });

    const [attachments, setAttachments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [sessionId, setSessionId] = useState(() => {
        const storedSessionId = localStorage.getItem(`farmEasySession-${currentChatId}`);
        return storedSessionId || null;
    });
    const { isAuthenticated, user } = useAuth(); // Get auth state

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            // Redirect to home where Navbar can handle login or just force them out
            // The Navbar "should" handle this if they used the link, but if they typed the URL directly:
            navigate('/');
        }
    }, [isAuthenticated, navigate]);    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`farmEasyMessages-${currentChatId}`, JSON.stringify(messages));

            // Update chat session with last message
            setChatSessions(prev => {
                const updated = prev.map(chat => {
                    if (chat.id === currentChatId) {
                        const lastMsg = messages[messages.length - 1];
                        return {
                            ...chat,
                            lastMessage: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
                            title: messages.length === 1 ? messages[0].content.substring(0, 30) : chat.title,
                        };
                    }
                    return chat;
                });
                localStorage.setItem('farmEasyChatSessions', JSON.stringify(updated));
                return updated;
            });
        }
    }, [messages, currentChatId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleNewChat = () => {
        const newChatId = `chat-${Date.now()}`;
        const newSession = {
            id: newChatId,
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            lastMessage: '',
        };

        setChatSessions(prev => {
            const updated = [newSession, ...prev];
            localStorage.setItem('farmEasyChatSessions', JSON.stringify(updated));
            return updated;
        });

        setCurrentChatId(newChatId);
        localStorage.setItem('farmEasyCurrentChatId', newChatId);
        setMessages([]);
        setSessionId(null);
    };

    const handleSwitchChat = (chatId) => {
        setCurrentChatId(chatId);
        localStorage.setItem('farmEasyCurrentChatId', chatId);
        const storedMessages = localStorage.getItem(`farmEasyMessages-${chatId}`);
        setMessages(storedMessages ? JSON.parse(storedMessages) : []);
        const storedSessionId = localStorage.getItem(`farmEasySession-${chatId}`);
        setSessionId(storedSessionId || null);
    };

    const handleDeleteChat = (chatId, e) => {
        e.stopPropagation();
        if (chatSessions.length === 1) return; // Don't delete last chat

        setChatSessions(prev => {
            const updated = prev.filter(chat => chat.id !== chatId);
            localStorage.setItem('farmEasyChatSessions', JSON.stringify(updated));
            return updated;
        });

        localStorage.removeItem(`farmEasyMessages-${chatId}`);
        localStorage.removeItem(`farmEasySession-${chatId}`);

        if (chatId === currentChatId) {
            const nextChat = chatSessions.find(chat => chat.id !== chatId);
            if (nextChat) {
                handleSwitchChat(nextChat.id);
            }
        }
    };

    const handleCopyMessage = (content, messageId) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    };

    const handleSendMessage = useCallback(
        async ({ input, attachments: msgAttachments }) => {
            if (!input.trim() && msgAttachments.length === 0) return;

            const userMessage = {
                id: `msg-${Date.now()}`,
                content: input,
                role: 'user',
                attachments: msgAttachments,
                timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setIsGenerating(true);

            try {
                const token = localStorage.getItem('token');
                const payload = {
                    question: input,
                    session_id: sessionId,
                };

                const response = await axios.post(
                    'http://localhost:8000/api/chat/',
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` }),
                        },
                    }
                );

                if (response.data.session_id && !sessionId) {
                    setSessionId(response.data.session_id);
                    localStorage.setItem(`farmEasySession-${currentChatId}`, response.data.session_id);
                }

                const aiMessage = {
                    id: `msg-${Date.now()}-ai`,
                    content: response.data.answer,
                    role: 'assistant',
                    retrieved: response.data.retrieved,
                    timestamp: new Date().toISOString(),
                };

                setMessages((prev) => [...prev, aiMessage]);
            } catch (error) {
                console.error('Error sending message:', error);

                const errorMessage = {
                    id: `msg-${Date.now()}-error`,
                    content: 'Sorry, I encountered an error. Please try again.',
                    role: 'assistant',
                    isError: true,
                    timestamp: new Date().toISOString(),
                };

                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsGenerating(false);
            }
        },
        [sessionId, currentChatId]
    );

    const handleStopGenerating = useCallback(() => {
        setIsGenerating(false);
    }, []);

    if (!isAuthenticated) return null;

    return (
        <>
            <Navbar />
            <div
                style={{
                    paddingTop: '72px',
                    height: '100vh',
                    backgroundColor: '#ffffc5',
                    display: 'flex',
                    overflow: 'hidden',
                }}
            >
                {/* Sidebar */}
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
                            {/* Sidebar Header */}
                            <div className="p-4 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Plus size={20} />
                                    New Chat
                                </button>
                            </div>

                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-2">
                                {chatSessions.map((chat) => (
                                    <motion.div
                                        key={chat.id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSwitchChat(chat.id)}
                                        className="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: chat.id === currentChatId ? '#f0fdf4' : 'transparent',
                                            border: chat.id === currentChatId ? '1px solid #4ade80' : '1px solid transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (chat.id !== currentChatId) {
                                                e.currentTarget.style.backgroundColor = '#f9fafb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (chat.id !== currentChatId) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare size={16} className="mt-1 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" style={{ color: '#1f2937' }}>
                                                    {chat.title}
                                                </div>
                                                {chat.lastMessage && (
                                                    <div className="text-xs truncate mt-1" style={{ color: '#6b7280' }}>
                                                        {chat.lastMessage}
                                                    </div>
                                                )}
                                            </div>
                                            {chatSessions.length > 1 && (
                                                <button
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                                                    style={{ color: '#dc2626' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* User Info */}
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

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>
                    {/* Chat Header */}
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

                    {/* Messages Container */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            backgroundColor: '#ffffc5',
                            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(74, 222, 128, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(22, 163, 74, 0.05) 0%, transparent 50%)',
                        }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center h-full text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <div>
                                        <div className="text-8xl mb-6">🌱</div>
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#15803d' }}>
                                            Welcome, {user?.username || 'Farmer'}!
                                        </h3>
                                        <p className="text-gray-700 max-w-md mx-auto">
                                            I'm your AI farming assistant powered by agricultural knowledge.
                                            Ask me anything about crops, pest management, soil health, or farming best practices!
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
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
                                                        : 'rounded-2xl px-5 py-4 shadow-lg'
                                                        }`}
                                                    style={{
                                                        backgroundColor: message.role === 'user'
                                                            ? '#16a34a'
                                                            : message.isError
                                                                ? '#fee2e2'
                                                                : '#ffffff',
                                                        color: message.role === 'user' ? '#ffffff' : '#1f2937',
                                                        border: message.role === 'assistant' && !message.isError ? '1px solid #e5e7eb' : 'none',
                                                    }}
                                                >
                                                    {message.role === 'assistant' && !message.isError && (
                                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                                                                <span className="text-sm">🤖</span>
                                                            </div>
                                                            <span className="font-semibold text-sm" style={{ color: '#15803d' }}>
                                                                FarmEasy AI
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                        {message.content}
                                                    </div>

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
                                                                {copiedMessageId === message.id ? (
                                                                    <Check size={14} style={{ color: '#16a34a' }} />
                                                                ) : (
                                                                    <Copy size={14} style={{ color: '#6b7280' }} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {isGenerating && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="rounded-2xl px-5 py-4 shadow-lg bg-white">
                                                <div className="flex gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="bg-white border-t-2 p-4" style={{ borderColor: '#e5e7eb' }}>
                        <div className="max-w-4xl mx-auto">
                            <PureMultimodalInput
                                chatId={currentChatId}
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
