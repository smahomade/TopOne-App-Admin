import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
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

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  user_id: string;
  sender_is_admin: boolean;
  content: string;
  created_at: string;
  is_read: boolean;
};

type Conversation = {
  user_id: string;
  first_name: string;
  last_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

// ─── Component ──────────────────────────────────────────────────────────────

const Book = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Customer view
  const [messages, setMessages] = useState<Message[]>([]);
  const customerListRef = useRef<FlatList>(null);

  // Admin conversation list view
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Admin: open conversation
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [convMessages, setConvMessages] = useState<Message[]>([]);
  const adminListRef = useRef<FlatList>(null);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const uid = session.user.id;
      setUserId(uid);

      const { data: profile } = await supabase
        .from('profiles')
        .select('admin_code')
        .eq('id', uid)
        .single();

      const admin = !!(profile?.admin_code);
      setIsAdmin(admin);

      if (admin) {
        await fetchConversations();
      } else {
        await fetchMessages(uid);
      }
    } catch (err) {
      console.error('initUser error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Customer: fetch & send ───────────────────────────────────────────────

  const fetchMessages = async (uid: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data ?? []);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userId) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      user_id: userId,
      sender_is_admin: false,
      content,
      is_read: false,
    });
    if (error) Alert.alert('Send failed', error.message);
    setSending(false);
  };

  // ─── Admin: conversations list ───────────────────────────────────────────

  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('user_id, content, created_at, is_read, sender_is_admin, profiles(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const map: Record<string, Conversation> = {};
      for (const m of data ?? []) {
        if (!map[m.user_id]) {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          map[m.user_id] = {
            user_id: m.user_id,
            first_name: (profile as any)?.first_name ?? 'Customer',
            last_name: (profile as any)?.last_name ?? '',
            last_message: m.content,
            last_message_at: m.created_at,
            unread_count: 0,
          };
        }
        if (!m.sender_is_admin && !m.is_read) {
          map[m.user_id].unread_count++;
        }
      }
      setConversations(Object.values(map).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      ));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load conversations.');
    } finally {
      setLoadingConvs(false);
    }
  };

  // ─── Admin: open a conversation ──────────────────────────────────────────

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', conv.user_id)
      .order('created_at', { ascending: true });
    if (!error) setConvMessages(data ?? []);

    // Mark customer messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('user_id', conv.user_id)
      .eq('sender_is_admin', false)
      .eq('is_read', false);

    // Refresh unread counts
    await fetchConversations();
  };

  const sendAdminReply = async () => {
    if (!inputText.trim() || !selectedConv) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      user_id: selectedConv.user_id,
      sender_is_admin: true,
      content,
      is_read: false,
    });
    if (error) Alert.alert('Send failed', error.message);
    setSending(false);
  };

  // ─── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (!isAdmin && msg.user_id === userId) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => customerListRef.current?.scrollToEnd({ animated: true }), 100);
          } else if (isAdmin) {
            if (selectedConv && msg.user_id === selectedConv.user_id) {
              setConvMessages((prev) => [...prev, msg]);
              setTimeout(() => adminListRef.current?.scrollToEnd({ animated: true }), 100);
            }
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isAdmin, selectedConv]);

  // ─── Shared: message bubble renderer ─────────────────────────────────────

  const renderBubble = (msg: Message) => {
    const isMine = isAdmin ? msg.sender_is_admin : !msg.sender_is_admin;
    return (
      <View
        key={msg.id}
        style={{
          alignSelf: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '78%',
          marginVertical: 3,
          marginHorizontal: 16,
        }}
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
        <Text
          style={{
            color: '#7B7B8B',
            fontSize: 11,
            marginTop: 2,
            marginHorizontal: 4,
            alignSelf: isMine ? 'flex-end' : 'flex-start',
          }}
        >
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  // ─── Shared: input bar ────────────────────────────────────────────────────

  const renderInputBar = (onSend: () => void) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#232533',
        backgroundColor: '#161622',
        gap: 8,
      }}
    >
      <TextInput
        value={inputText}
        onChangeText={setInputText}
        placeholder="Type a message..."
        placeholderTextColor="#7B7B8B"
        multiline
        style={{
          flex: 1,
          backgroundColor: '#232533',
          color: '#FFFFFF',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: 15,
          maxHeight: 120,
        }}
        onSubmitEditing={onSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={sending || !inputText.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: inputText.trim() ? '#8ED1FC' : '#232533',
          alignItems: 'center',
          justifyContent: 'center',
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

  // ─── Views ────────────────────────────────────────────────────────────────

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
        <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center', fontFamily: 'Poppins-Regular' }}>
          Please sign in to access messages.
        </Text>
      </SafeAreaView>
    );
  }

  // ── Admin: conversation thread ──────────────────────────────────────────
  if (isAdmin && selectedConv) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#232533',
          }}
        >
          <TouchableOpacity
            onPress={() => { setSelectedConv(null); setConvMessages([]); }}
            style={{ marginRight: 12 }}
          >
            <Image
              source={icons.leftArrow}
              style={{ width: 22, height: 22 }}
              tintColor="#8ED1FC"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#232533',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Text style={{ color: '#8ED1FC', fontSize: 17, fontWeight: '600' }}>
              {selectedConv.first_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600', flex: 1 }}>
            {selectedConv.first_name} {selectedConv.last_name}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={adminListRef}
            data={convMessages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => renderBubble(item)}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => adminListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: '#7B7B8B', fontSize: 14 }}>No messages yet.</Text>
              </View>
            }
          />
          {renderInputBar(sendAdminReply)}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Admin: conversation list ────────────────────────────────────────────
  if (isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 12 }}>
          <Image
            source={images.logoTopOneWhite}
            style={{ width: 160, height: 64 }}
            resizeMode="contain"
          />
        </View>
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#232533',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '600' }}>Messages</Text>
          <Text style={{ color: '#7B7B8B', fontSize: 13, marginTop: 2 }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>

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
            data={conversations}
            keyExtractor={(c) => c.user_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openConversation(item)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#232533',
                }}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#232533',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Text style={{ color: '#8ED1FC', fontSize: 20, fontWeight: '600' }}>
                    {item.first_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: item.unread_count > 0 ? '700' : '400' }}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text
                    style={{ color: '#7B7B8B', fontSize: 13, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.last_message}
                  </Text>
                </View>

                {/* Unread badge */}
                {item.unread_count > 0 && (
                  <View
                    style={{
                      backgroundColor: '#8ED1FC',
                      borderRadius: 12,
                      minWidth: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: '#161622', fontSize: 12, fontWeight: '700' }}>
                      {item.unread_count}
                    </Text>
                  </View>
                )}

                <Image
                  source={icons.rightArrow}
                  style={{ width: 16, height: 16, marginLeft: 8 }}
                  tintColor="#7B7B8B"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Customer: chat thread ───────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#232533',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#232533',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Image
            source={icons.scissors}
            style={{ width: 22, height: 22 }}
            tintColor="#8ED1FC"
            resizeMode="contain"
          />
        </View>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>TopOne Salon</Text>
          <Text style={{ color: '#7B7B8B', fontSize: 12 }}>Richmond</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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
              <Image
                source={icons.scissors}
                style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.4 }}
                tintColor="#CDCDE0"
                resizeMode="contain"
              />
              <Text style={{ color: '#CDCDE0', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                Send a message to TopOne Salon.{'\n'}We'll get back to you shortly!
              </Text>
            </View>
          }
        />
        {renderInputBar(sendMessage)}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Book;
