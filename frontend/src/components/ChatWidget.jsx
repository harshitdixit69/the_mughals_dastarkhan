import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatApi, cartApi } from '../services/api';
import { toast } from 'sonner';
import { MessageCircle, X, Send, ShoppingCart, Sparkles, Bot, User, Loader2, ChevronDown } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!user && !!token);
    } catch {
      setIsLoggedIn(false);
    }
  }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Show welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Adaab! 🙏 Welcome to **The Mughal's Dastarkhwan**. I'm your personal food assistant.\n\nI can help you with:\n• 🍽️ Menu recommendations & combos\n• 💰 Budget-friendly meal planning\n• 🥬 Vegetarian/non-veg options\n• 📦 Order status queries\n\nWhat are you in the mood for today?",
        suggested_items: [],
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: msg, suggested_items: [] };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history for context
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const response = isLoggedIn
        ? await chatApi.send(msg, history)
        : await chatApi.sendQuick(msg, history);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply,
        suggested_items: response.suggested_items || [],
      }]);
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Failed to get a response. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong: ${errMsg}`,
        suggested_items: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddToCart = async (item) => {
    if (!isLoggedIn) {
      toast.error('Please login to add items to cart');
      return;
    }
    try {
      await cartApi.addToCart(item.id, 1);
      toast.success(`${item.name} added to cart!`);
    } catch {
      toast.error('Failed to add item to cart');
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    // Auto-send
    setTimeout(() => {
      setInput('');
      const userMsg = { role: 'user', content: prompt, suggested_items: [] };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);

      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const apiCall = isLoggedIn
        ? chatApi.send(prompt, history)
        : chatApi.sendQuick(prompt, history);

      apiCall.then(response => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.reply,
          suggested_items: response.suggested_items || [],
        }]);
      }).catch(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          suggested_items: [],
        }]);
      }).finally(() => setLoading(false));
    }, 100);
  };

  const formatMessage = (text) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/• /g, '&bull; ')
      .replace(/- /g, '&ndash; ');
  };

  const quickPrompts = [
    { label: '🍗 Best non-veg combo', prompt: 'Suggest the best non-veg combo for 2 people' },
    { label: '🥬 Veg meal under ₹800', prompt: 'Suggest a veg meal for 2 under ₹800' },
    { label: '🌶️ Something spicy', prompt: 'Show me your spiciest dishes' },
    { label: '👨‍👩‍👧‍👦 Family feast', prompt: 'Suggest a feast for 4-5 people under ₹2500' },
  ];

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-amber-600 hover:bg-amber-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat assistant"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-amber-600 animate-pulse" />
          </div>
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Ask our AI Assistant ✨
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Mughal's AI Assistant</h3>
                <p className="text-xs text-amber-100">
                  {loading ? 'Thinking...' : 'Online • Ask me anything'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMessages([]);
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition text-xs"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-amber-700" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Suggested Items — Quick Add to Cart */}
                {msg.role === 'assistant' && msg.suggested_items && msg.suggested_items.length > 0 && (
                  <div className="ml-9 mt-2 space-y-1.5">
                    {msg.suggested_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">
                            {item.is_veg ? '🟢' : '🔴'} {item.name}
                          </p>
                          <p className="text-xs text-amber-700 font-semibold">₹{item.price}</p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="ml-2 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-xs font-medium transition flex-shrink-0"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-amber-700" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts — shown only when no user messages yet */}
          {messages.filter(m => m.role === 'user').length === 0 && !loading && (
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex-shrink-0">
              <p className="text-xs text-slate-500 mb-1.5">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-full border border-amber-200 transition"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about our menu, combos, orders..."
                className="flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent max-h-20"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {!isLoggedIn && (
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Log in for personalized recommendations & order tracking
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
