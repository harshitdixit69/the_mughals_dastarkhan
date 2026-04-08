import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { chatApi } from '../services/api';
import { useCart } from '../context/CartContext';

export default function ChatScreen() {
  const { addToCart } = useCart();
  const [messages, setMessages] = useState([
    { id: '0', role: 'assistant', content: "Assalamu Alaikum! 🌙 Welcome to The Mughal's Dastarkhan. I'm your AI assistant — ask me about our menu, get recommendations for your budget, or check order status!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const flatRef = useRef();

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSuggestedItems([]);

    try {
      const history = messages.filter(m => m.id !== '0').map(m => ({ role: m.role, content: m.content }));
      const data = await chatApi.send(text, history);
      const assistantMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.suggested_items?.length) setSuggestedItems(data.suggested_items);
    } catch (e) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again.' };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleAddSuggested = async (item) => {
    try {
      await addToCart(item.id, 1);
    } catch { /* silent */ }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.avatar}>
            <Ionicons name="restaurant" size={16} color={COLORS.black} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
          <Text style={[s.msgText, isUser && s.msgTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <>
            {loading && (
              <View style={[s.msgRow]}>
                <View style={s.avatar}><Ionicons name="restaurant" size={16} color={COLORS.black} /></View>
                <View style={[s.bubble, s.bubbleAssistant]}>
                  <ActivityIndicator size="small" color={COLORS.gray500} />
                </View>
              </View>
            )}
            {suggestedItems.length > 0 && (
              <View style={s.suggestionsContainer}>
                <Text style={s.suggestionsTitle}>Quick Add to Cart</Text>
                {suggestedItems.map(item => (
                  <View key={item.id} style={s.sugCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sugName}>{item.name}</Text>
                      <Text style={s.sugPrice}>₹{item.price}</Text>
                    </View>
                    <TouchableOpacity style={s.sugAddBtn} onPress={() => handleAddSuggested(item)}>
                      <Ionicons name="add" size={18} color={COLORS.black} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        }
      />

      {/* Quick prompts */}
      <View style={s.quickRow}>
        {['Popular dishes?', 'Veg options', 'Budget ₹500'].map(q => (
          <TouchableOpacity key={q} style={s.quickChip} onPress={() => { setInput(q); }}>
            <Text style={s.quickText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Ask about menu, recommendations..."
          placeholderTextColor={COLORS.gray400}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          <Ionicons name="send" size={20} color={input.trim() ? COLORS.black : COLORS.gray400} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  list: { padding: SIZES.md, paddingBottom: SIZES.sm },

  msgRow: { flexDirection: 'row', marginBottom: SIZES.sm, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  bubble: { maxWidth: '78%', borderRadius: SIZES.radius, padding: SIZES.sm },
  bubbleUser: { backgroundColor: COLORS.gray900, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.gray200 },
  msgText: { fontSize: 14, color: COLORS.gray800, lineHeight: 20 },
  msgTextUser: { color: COLORS.white },

  suggestionsContainer: { marginLeft: 38, marginBottom: SIZES.sm },
  suggestionsTitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray500, marginBottom: 6 },
  sugCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusSm, padding: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.gray100, marginBottom: 4,
  },
  sugName: { fontSize: 13, fontWeight: '600', color: COLORS.gray900 },
  sugPrice: { fontSize: 12, color: COLORS.gray500 },
  sugAddBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  quickRow: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.sm, paddingBottom: 6 },
  quickChip: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.gray200,
  },
  quickText: { fontSize: 12, color: COLORS.gray600 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    borderTopWidth: 1, borderTopColor: COLORS.gray200, backgroundColor: COLORS.white,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.gray800, paddingVertical: 8 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray100 },
});
