import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { images, icons } from '../../constants';
import { useLocation } from '../../context/LocationContext';

// â”€â”€â”€ UUID helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Message = {
  id: string;
  user_id: string;
  conversation_id: string;
  sender_is_admin: boolean;
  content: string;
  created_at: string;
  is_read: boolean;
};

type Conversation = {
  conversation_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  last_message: string;
  last_message_at: string;
  started_at: string;
  unread_count: number;
  closed_at: string | null;
  location_id: string | null;
};

type UserConversation = {
  conversation_id: string;
  last_message: string;
  last_message_at: string;
  started_at: string;
  closed_at: string | null;
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Book = () => {
  const { locations } = useLocation();

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Customer: conversation list
  const [userConversations, setUserConversations] = useState<UserConversation[]>([]);
  // Customer: active thread
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConvClosedAt, setActiveConvClosedAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const customerListRef = useRef<FlatList>(null);

  // Admin: conversation list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null);
  // Admin: open thread
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [convMessages, setConvMessages] = useState<Message[]>([]);
  const adminListRef = useRef<FlatList>(null);

  // â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => { initUser(); }, []);

  // Refresh admin conversation list every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      if (isAdmin) fetchConversations();
    }, [isAdmin])
  );

  const initUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);

      const { data: profile } = await supabase
        .from('profiles').select('admin_code').eq('id', uid).single();

      const admin = !!(profile?.admin_code);
      setIsAdmin(admin);

      if (admin) {
        await fetchConversations();
      } else {
        await fetchUserConversations(uid);
      }
    } catch (err) {
      console.error('initUser error:', err);
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€â”€ Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchUserConversations = async (uid: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .eq('user_id', uid)
      .not('conversation_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) { console.error('fetchUserConversations error:', error.message); return; }

    const map: Record<string, UserConversation> = {};
    for (const m of data ?? []) {
      if (!map[m.conversation_id]) {
        map[m.conversation_id] = {
          conversation_id: m.conversation_id,
          last_message: m.content,
          last_message_at: m.created_at,
          started_at: m.created_at,
          closed_at: null,
        };
      } else {
        // Descending order means later items are older â†’ track earliest
        map[m.conversation_id].started_at = m.created_at;
      }
    }
    // Join closed_at from conversation_metadata
    const convIds = Object.keys(map);
    if (convIds.length > 0) {
      const { data: metadata } = await supabase
        .from('conversation_metadata')
        .select('conversation_id, closed_at')
        .in('conversation_id', convIds);
      for (const m of metadata ?? []) {
        if (map[m.conversation_id]) map[m.conversation_id].closed_at = m.closed_at ?? null;
      }
    }

    setUserConversations(
      Object.values(map).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      )
    );
  };

  const openUserConversation = async (convId: string) => {
    setActiveConvId(convId);
    setMessages([]);
    // Set closed status from already-fetched list
    const found = userConversations.find(c => c.conversation_id === convId);
    setActiveConvClosedAt(found?.closed_at ?? null);
    const { data, error } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data ?? []);
    else Alert.alert('Could not load messages', error.message);
  };

  const startNewConversation = () => {
    setActiveConvId(generateUUID());
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userId || !activeConvId) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      user_id: userId,
      conversation_id: activeConvId,
      sender_is_admin: false,
      content,
      is_read: false,
    });
    if (error) Alert.alert('Send failed', error.message);
    setSending(false);
  };

  // â”€â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
// Auto-delete conversations closed more than 2 weeks ago
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired } = await supabase
      .from('conversation_metadata')
      .select('conversation_id')
      .not('closed_at', 'is', null)
      .lt('closed_at', twoWeeksAgo);
    if (expired && expired.length > 0) {
      const expiredIds = expired.map((e: any) => e.conversation_id);
      await supabase.from('messages').delete().in('conversation_id', expiredIds);
      await supabase.from('conversation_metadata').delete().in('conversation_id', expiredIds);
    }

    const { data: msgs, error } = await supabase
        .from('messages')
        .select('user_id, conversation_id, content, created_at, is_read, sender_is_admin, location_id')
        .not('conversation_id', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((msgs ?? []).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, first_name, last_name').in('id', userIds);

      const profileMap: Record<string, { first_name: string; last_name: string }> = {};
      for (const p of profiles ?? []) {
        profileMap[p.id] = { first_name: p.first_name ?? 'Customer', last_name: p.last_name ?? '' };
      }

      const map: Record<string, Conversation> = {};
      for (const m of msgs ?? []) {
        const key = m.conversation_id;
        if (!map[key]) {
          map[key] = {
            conversation_id: key,
            user_id: m.user_id,
            first_name: profileMap[m.user_id]?.first_name ?? 'Customer',
            last_name: profileMap[m.user_id]?.last_name ?? '',
            last_message: m.content,
            last_message_at: m.created_at,
            started_at: m.created_at,
            unread_count: 0,
            closed_at: null,
            location_id: m.location_id ?? null,
          };
        } else {
          map[key].started_at = m.created_at;
        }
        if (!m.sender_is_admin && !m.is_read) map[key].unread_count++;
      }
      const { data: metadata } = await supabase
        .from('conversation_metadata')
        .select('conversation_id, closed_at');
      const metaMap: Record<string, string | null> = {};
      for (const m of metadata ?? []) metaMap[m.conversation_id] = m.closed_at ?? null;
      for (const key of Object.keys(map)) {
        map[key].closed_at = metaMap[key] ?? null;
      }

      setConversations(
        Object.values(map).sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load conversations.');
    } finally {
      setLoadingConvs(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setConvMessages([]);
    const { data, error } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', conv.conversation_id)
      .order('created_at', { ascending: true });
    if (!error) setConvMessages(data ?? []);

    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', conv.conversation_id)
      .eq('sender_is_admin', false).eq('is_read', false);

    await fetchConversations();
  };

  const sendAdminReply = async () => {
    if (!inputText.trim() || !selectedConv) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      user_id: selectedConv.user_id,
      conversation_id: selectedConv.conversation_id,
      sender_is_admin: true,
      content,
      is_read: false,
      location_id: selectedConv.location_id ?? null,
    });
    if (error) Alert.alert('Send failed', error.message);
    setSending(false);
  };
  const closeConversation = async () => {
    if (!selectedConv) return;
    const now = new Date().toISOString();
    await supabase.from('conversation_metadata').upsert(
      { conversation_id: selectedConv.conversation_id, closed_at: now },
      { onConflict: 'conversation_id' }
    );
    const updated = { ...selectedConv, closed_at: now };
    setSelectedConv(updated);
    setConversations(prev => prev.map(c =>
      c.conversation_id === selectedConv.conversation_id ? { ...c, closed_at: now } : c
    ));
  };

  const reopenConversation = async () => {
    if (!selectedConv) return;
    await supabase.from('conversation_metadata').upsert(
      { conversation_id: selectedConv.conversation_id, closed_at: null },
      { onConflict: 'conversation_id' }
    );
    const updated = { ...selectedConv, closed_at: null };
    setSelectedConv(updated);
    setConversations(prev => prev.map(c =>
      c.conversation_id === selectedConv.conversation_id ? { ...c, closed_at: null } : c
    ));
  };

  const getDeleteCountdown = (closedAt: string): string => {
    const deleteAt = new Date(closedAt).getTime() + 14 * 24 * 60 * 60 * 1000;
    const msLeft = deleteAt - Date.now();
    if (msLeft <= 0) return 'deleting soon';
    const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
    const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `deletes in ${days}d ${hours}h`;
    const mins = Math.floor((msLeft % (60 * 60 * 1000)) / 60000);
    return `deletes in ${hours}h ${mins}m`;
  };
  // â”€â”€â”€ Realtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-realtime-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (!isAdmin) {
            if (msg.user_id === userId && msg.conversation_id === activeConvId) {
              setMessages((prev) => [...prev, msg]);
              setTimeout(() => customerListRef.current?.scrollToEnd({ animated: true }), 100);
            }
            if (msg.user_id === userId) fetchUserConversations(userId);
          } else {
            if (selectedConv && msg.conversation_id === selectedConv.conversation_id) {
              setConvMessages((prev) => [...prev, msg]);
              setTimeout(() => adminListRef.current?.scrollToEnd({ animated: true }), 100);
            }
            fetchConversations();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isAdmin, selectedConv, activeConvId]);

  // â”€â”€â”€ Shared: bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const BOOKING_PREFIX = 'BOOKING_REQUEST';

  const renderBubble = (msg: Message) => {
    const isMine = isAdmin ? msg.sender_is_admin : !msg.sender_is_admin;
    const isBookingRequest = isAdmin && !msg.sender_is_admin && msg.content.startsWith(BOOKING_PREFIX);

    // ── Admin sees booking requests as a highlight card ──────────────────────
    if (isBookingRequest) {
      // Strip the prefix and the wait note at the bottom
      const withoutPrefix = msg.content.replace(/^BOOKING_REQUEST\s*/, '');
      // Split on the \n\n to separate the main line from the "(Please ... wait)" note
      const parts = withoutPrefix.split('\n\n');
      const mainLine = parts[0].trim();   // "John would like to book for ..."
      const note = parts[1]?.replace(/^\(|\)$/g, '').trim(); // "Please John wait for an admin to respond"

      return (
        <View key={msg.id} style={{ marginHorizontal: 12, marginVertical: 8 }}>
          {/* Card */}
          <View
            style={{
              backgroundColor: '#1A1A2E',
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: '#8ED1FC',
              overflow: 'hidden',
            }}
          >
            {/* Coloured header bar */}
            <View style={{ backgroundColor: '#8ED1FC', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={icons.scissors} style={{ width: 16, height: 16 }} tintColor="#161622" resizeMode="contain" />
              <Text style={{ color: '#161622', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                New Booking Request
              </Text>
            </View>
            {/* Body */}
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 24 }}>
                {mainLine}
              </Text>
              {!!note && (
                <Text style={{ color: '#7B7B8B', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                  {note}
                </Text>
              )}
            </View>
          </View>
          <Text style={{ color: '#7B7B8B', fontSize: 11, marginTop: 4, marginHorizontal: 4 }}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    // ── Regular bubble ────────────────────────────────────────────────────────
    return (
      <View
        key={msg.id}
        style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '78%', marginVertical: 3, marginHorizontal: 16 }}
      >
        <View
          style={{
            backgroundColor: isMine ? '#8ED1FC' : '#232533',
            borderRadius: 18,
            borderBottomRightRadius: isMine ? 4 : 18,
            borderBottomLeftRadius: isMine ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: isMine ? '#161622' : '#FFFFFF', fontSize: 15, lineHeight: 21 }}>
            {msg.content}
          </Text>
        </View>
        <Text style={{ color: '#7B7B8B', fontSize: 11, marginTop: 2, marginHorizontal: 4, alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  // â”€â”€â”€ Shared: input bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderInputBar = (onSend: () => void) => (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#232533',
        backgroundColor: '#161622', gap: 8,
      }}
    >
      <TextInput
        value={inputText}
        onChangeText={setInputText}
        placeholder="Type a message..."
        placeholderTextColor="#7B7B8B"
        multiline
        style={{
          flex: 1, backgroundColor: '#232533', color: '#FFFFFF',
          borderRadius: 20, paddingHorizontal: 16,
          paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 120,
        }}
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={sending || !inputText.trim()}
        style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: inputText.trim() ? '#8ED1FC' : '#232533',
          alignItems: 'center', justifyContent: 'center',
        }}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#161622" />
        ) : (
          <Image
            source={icons.upload}
            style={{ width: 20, height: 20, transform: [{ rotate: '90deg' }] }}
            tintColor={inputText.trim() ? '#161622' : '#7B7B8B'}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </View>
  );

  // â”€â”€â”€ Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#8ED1FC" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center' }}>
          Please sign in to access messages.
        </Text>
      </SafeAreaView>
    );
  }

  // â”€â”€ Admin: conversation thread â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAdmin && selectedConv) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
          <TouchableOpacity onPress={() => { setSelectedConv(null); setConvMessages([]); }} style={{ marginRight: 12 }}>
            <Image source={icons.leftArrow} style={{ width: 22, height: 22 }} tintColor="#8ED1FC" resizeMode="contain" />
          </TouchableOpacity>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#232533', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ color: '#8ED1FC', fontSize: 17, fontWeight: '600' }}>
              {selectedConv.first_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
              {selectedConv.first_name} {selectedConv.last_name}
            </Text>
            <Text style={{ color: '#7B7B8B', fontSize: 12 }}>
              Started {new Date(selectedConv.started_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          {selectedConv.closed_at ? (
            <TouchableOpacity onPress={reopenConversation} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#0f2b1a', borderWidth: 1, borderColor: '#4ade80' }}>
              <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '600' }}>Reopen</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={closeConversation} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#2b0f0f', borderWidth: 1, borderColor: '#f87171' }}>
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <FlatList
            ref={adminListRef}
            data={convMessages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => renderBubble(item)}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => adminListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: '#7B7B8B', fontSize: 14 }}>No messages yet.</Text>
              </View>
            }
          />
          {selectedConv.closed_at ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#232533', alignItems: 'center', backgroundColor: '#161622' }}>
              <Text style={{ color: '#f87171', fontSize: 13 }}>This conversation is closed</Text>
              <Text style={{ color: '#7B7B8B', fontSize: 11, marginTop: 3 }}>{getDeleteCountdown(selectedConv.closed_at)}</Text>
            </View>
          ) : renderInputBar(sendAdminReply)}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // â”€â”€ Admin: conversation list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 12 }}>
          <Image source={images.logoTopOneWhite} style={{ width: 160, height: 64 }} resizeMode="contain" />
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '600' }}>Messages</Text>
          <Text style={{ color: '#7B7B8B', fontSize: 13, marginTop: 2 }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {locations.length > 1 && (
          <View style={{ height: 52, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
              <TouchableOpacity
                onPress={() => setFilterLocationId(null)}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filterLocationId === null ? '#8ED1FC' : '#232533', borderWidth: 1, borderColor: filterLocationId === null ? '#8ED1FC' : '#3a3a4a' }}
              >
                <Text style={{ color: filterLocationId === null ? '#161622' : '#CDCDE0', fontSize: 13, fontWeight: '600' }}>All</Text>
              </TouchableOpacity>
              {locations.map(loc => (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => setFilterLocationId(loc.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filterLocationId === loc.id ? '#8ED1FC' : '#232533', borderWidth: 1, borderColor: filterLocationId === loc.id ? '#8ED1FC' : '#3a3a4a' }}
                >
                  <Text style={{ color: filterLocationId === loc.id ? '#161622' : '#CDCDE0', fontSize: 13, fontWeight: '600' }}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {loadingConvs ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#8ED1FC" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center' }}>
              No messages yet.{'\n'}Customers will appear here when they message you.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filterLocationId ? conversations.filter(c => c.location_id === filterLocationId) : conversations}
            keyExtractor={(c) => c.conversation_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={loadingConvs}
                onRefresh={fetchConversations}
                tintColor="#8ED1FC"
                colors={['#8ED1FC']}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openConversation(item)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#232533' }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#232533', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ color: '#8ED1FC', fontSize: 22, fontWeight: '700' }}>
                    {item.first_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 }}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text style={{ color: '#8ED1FC', fontSize: 11, marginTop: 2 }}>
                    {new Date(item.started_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={{ color: '#CDCDE0', fontSize: 14, marginTop: 3, lineHeight: 20 }} numberOfLines={2}>
                    {item.last_message}
                  </Text>
                </View>
                {item.closed_at && (
                  <View style={{ backgroundColor: '#2b0f0f', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6, alignItems: 'center' }}>
                    <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600' }}>Closed</Text>
                    <Text style={{ color: '#7B7B8B', fontSize: 10, marginTop: 1 }}>{getDeleteCountdown(item.closed_at)}</Text>
                  </View>
                )}
                {item.unread_count > 0 && (
                  <View style={{ backgroundColor: '#8ED1FC', borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 }}>
                    <Text style={{ color: '#161622', fontSize: 12, fontWeight: '700' }}>{item.unread_count}</Text>
                  </View>
                )}
                <Image source={icons.rightArrow} style={{ width: 16, height: 16, marginLeft: 8 }} tintColor="#7B7B8B" resizeMode="contain" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // â”€â”€ Customer: active thread â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (activeConvId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
          <TouchableOpacity
            onPress={() => { setActiveConvId(null); setActiveConvClosedAt(null); setMessages([]); if (userId) fetchUserConversations(userId); }}
            style={{ marginRight: 12 }}
          >
            <Image source={icons.leftArrow} style={{ width: 22, height: 22 }} tintColor="#8ED1FC" resizeMode="contain" />
          </TouchableOpacity>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#232533', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Image source={icons.scissors} style={{ width: 22, height: 22 }} tintColor="#8ED1FC" resizeMode="contain" />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>TopOne Salon</Text>
            <Text style={{ color: '#7B7B8B', fontSize: 12 }}>Richmond</Text>
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <FlatList
            ref={customerListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => renderBubble(item)}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => customerListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                  Send your first message to{'\n'}TopOne Salon!
                </Text>
              </View>
            }
          />
          {activeConvClosedAt ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#232533', alignItems: 'center', backgroundColor: '#161622' }}>
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '600' }}>This conversation has been closed</Text>
              <Text style={{ color: '#7B7B8B', fontSize: 12, marginTop: 3 }}>The salon will no longer receive new messages here</Text>
            </View>
          ) : renderInputBar(sendMessage)}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // â”€â”€ Customer: conversation list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '600' }}>Messages</Text>
      </View>

      <TouchableOpacity
        onPress={startNewConversation}
        style={{ margin: 16, backgroundColor: '#8ED1FC', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
        activeOpacity={0.8}
      >
        <Image source={icons.plus} style={{ width: 20, height: 20 }} tintColor="#161622" resizeMode="contain" />
        <Text style={{ color: '#161622', fontSize: 16, fontWeight: '600' }}>New Conversation</Text>
      </TouchableOpacity>

      {userConversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Image source={icons.scissors} style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.4 }} tintColor="#CDCDE0" resizeMode="contain" />
          <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            No conversations yet.{'\n'}Tap "New Conversation" to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={userConversations}
          keyExtractor={(c) => c.conversation_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openUserConversation(item.conversation_id)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#232533' }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#232533', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Image source={icons.scissors} style={{ width: 22, height: 22 }} tintColor="#8ED1FC" resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>TopOne Salon</Text>
                <Text style={{ color: '#8ED1FC', fontSize: 11, marginTop: 1 }}>
                  {new Date(item.started_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={{ color: '#7B7B8B', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {item.last_message}
                </Text>
              </View>
              <Image source={icons.rightArrow} style={{ width: 16, height: 16, marginLeft: 8 }} tintColor="#7B7B8B" resizeMode="contain" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default Book;
