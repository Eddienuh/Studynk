import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchGroup = useCallback(async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const groupRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/my-group`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroup(groupData.group);
        setMembers(groupData.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch group:', error);
    }
  }, [token]);

  const fetchMessages = useCallback(async () => {
    if (!group) return;
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const messagesRes = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/messages/group/${group.group_id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [group, token]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  useEffect(() => {
    if (!activeChat) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChat, fetchMessages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroup();
    if (activeChat) await fetchMessages();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !group) return;
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage }),
      });
      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // ───── No Group ─────
  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.listHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.divider }]}>
          <Text style={[styles.listTitle, { color: theme.accent }]}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>Join a study group to start messaging</Text>
        </View>
      </View>
    );
  }

  // ───── Chat View ─────
  if (activeChat) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.bg }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.chatHeaderAvatar}>
            <Text style={styles.chatHeaderAvatarText}>
              {(group.group_name || group.course || 'S').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>{group.group_name || group.course}</Text>
            <Text style={styles.chatHeaderSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Goal Pin */}
        <View style={styles.goalPin}>
          <Ionicons name="flag" size={16} color="#FF9800" />
          <Text style={styles.goalText} numberOfLines={1}>
            {group.course ? `Ace ${group.course} together!` : 'Study smarter as a group'}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesSub}>Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.user_id;
              const isPoll = typeof message.content === 'string' && message.content.startsWith('/poll');
              const displayContent = isPoll ? message.content.replace(/^\/poll\s*/, '') : message.content;

              return (
                <View key={message.message_id} style={[styles.msgWrap, isOwn && styles.msgWrapOwn]}>
                  {!isOwn && <Text style={styles.senderName}>{message.sender_name}</Text>}
                  <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, isPoll && styles.bubblePoll]}>
                    {isPoll && (
                      <View style={styles.pollHeader}>
                        <Ionicons name="bar-chart-outline" size={14} color="#6A1B9A" />
                        <Text style={styles.pollLabel}>Poll</Text>
                      </View>
                    )}
                    <Text style={[styles.msgText, isOwn && !isPoll && styles.msgTextOwn, isPoll && styles.msgTextPoll]}>
                      {displayContent}
                    </Text>
                    <Text style={[styles.msgTime, isOwn && !isPoll && styles.msgTimeOwn]}>
                      {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ───── WhatsApp-style Conversation List ─────
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.listHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.divider }]}>
        <Text style={[styles.listTitle, { color: theme.accent }]}>Messages</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <TouchableOpacity
          style={styles.convoRow}
          onPress={() => setActiveChat(group)}
          activeOpacity={0.7}
        >
          <View style={styles.convoAvatar}>
            <Text style={styles.convoAvatarText}>
              {(group.group_name || group.course || 'S').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.convoInfo}>
            <Text style={styles.convoName} numberOfLines={1}>{group.group_name || group.course}</Text>
            <Text style={styles.convoPreview} numberOfLines={1}>
              {lastMessage
                ? `${lastMessage.sender_name}: ${lastMessage.content}`
                : `${members.length} member${members.length !== 1 ? 's' : ''} · Tap to chat`}
            </Text>
          </View>
          <View style={styles.convoMeta}>
            {lastMessage && (
              <Text style={styles.convoTime}>
                {new Date(lastMessage.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            )}
            {messages.length > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{messages.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  /* ── List Header ── */
  listHeader: {
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  listTitle: { fontSize: 28, fontWeight: '700', color: '#2DAFE3' },

  /* ── Conversation Row (WhatsApp style) ── */
  convoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  convoAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center',
  },
  convoAvatarText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  convoInfo: { flex: 1, marginLeft: 14 },
  convoName: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  convoPreview: { fontSize: 14, color: '#888', marginTop: 2 },
  convoMeta: { alignItems: 'flex-end' },
  convoTime: { fontSize: 12, color: '#AAA', marginBottom: 4 },
  unreadBadge: {
    backgroundColor: '#2DAFE3', minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  /* ── Empty ── */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 8 },

  /* ── Chat Header ── */
  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  backBtn: { padding: 8 },
  chatHeaderAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  chatHeaderAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  chatHeaderInfo: { flex: 1, marginLeft: 10 },
  chatHeaderName: { fontSize: 17, fontWeight: '600', color: '#333' },
  chatHeaderSub: { fontSize: 12, color: '#888' },

  /* ── Goal Pin ── */
  goalPin: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8E1', paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFE082',
  },
  goalText: { fontSize: 13, fontWeight: '600', color: '#F57C00', marginLeft: 8, flex: 1 },

  /* ── Messages ── */
  messagesContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  messagesContent: { padding: 16 },
  emptyMessages: { alignItems: 'center', marginTop: 64 },
  emptyMessagesText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptyMessagesSub: { fontSize: 14, color: '#999', marginTop: 4 },

  msgWrap: { marginBottom: 16, maxWidth: '80%' },
  msgWrapOwn: { alignSelf: 'flex-end' },
  senderName: { fontSize: 12, color: '#666', marginBottom: 4, marginLeft: 12 },
  bubble: { padding: 12, borderRadius: 16 },
  bubbleOwn: { backgroundColor: '#2DAFE3', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  bubblePoll: { backgroundColor: '#F3E5F5', borderLeftWidth: 3, borderLeftColor: '#9C27B0' },
  pollHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pollLabel: { fontSize: 11, fontWeight: '700', color: '#6A1B9A', marginLeft: 4, textTransform: 'uppercase' },
  msgText: { fontSize: 16, color: '#333', lineHeight: 22 },
  msgTextOwn: { color: '#FFF' },
  msgTextPoll: { color: '#4A148C' },
  msgTime: { fontSize: 11, color: '#999', marginTop: 4 },
  msgTimeOwn: { color: '#E0F7FA' },

  /* ── Input ── */
  inputContainer: {
    flexDirection: 'row', padding: 12, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#E0E0E0', alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: '#333', maxHeight: 100, marginRight: 8,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2DAFE3', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CCC' },
});
