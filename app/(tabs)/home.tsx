import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images, icons } from '../../constants';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useLocation } from '../../context/LocationContext';

type Banner = {
  id: string;
  title: string;
  description: string;
  long_description: string;
  image_url: string;
  sort_order: number;
  text_align: 'left' | 'right';
};

const STORAGE_BUCKET = 'images';

const Home = () => {
  const { selectedLocationId, selectedLocationName, locations, setSelectedLocation, refreshLocations } = useLocation();
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [userName, setUserName] = useState('Guest');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add banner modal state
  const [addModal, setAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLongDesc, setNewLongDesc] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newAlign, setNewAlign] = useState<'left' | 'right'>('left');
  const [adding, setAdding] = useState(false);

  // Edit alignment
  const [editAlign, setEditAlign] = useState<'left' | 'right'>('left');
  const [editLongDesc, setEditLongDesc] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('');

  // Bucket picker state
  const [bucketModal, setBucketModal] = useState(false);
  const [bucketImages, setBucketImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [bucketOnPick, setBucketOnPick] = useState<((url: string) => void) | null>(null);

  useEffect(() => {
    // Fetch name immediately for any existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUserName(session.user.id);
    });

    // Re-fetch name whenever auth state changes (e.g. after login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserName(session.user.id);
      } else {
        setUserName('Guest');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchBanners();
    }
  }, [selectedLocationId]);

  const fetchUserName = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', uid)
        .single();
      if (!error && data?.first_name) {
        setUserName(data.first_name);
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) fetchUserName(session.user.id);
      });
      refreshLocations();
    }, [])
  );

  const fetchBanners = async () => {
    setLoadingBanners(true);

    try {
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, description, long_description, image_url, sort_order, text_align')
        .eq('location_id', selectedLocationId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching banners:', error.message);
      } else {
        setBanners(data ?? []);
      }
    } catch (error) {
      console.error('Unexpected error fetching banners:', error);
    } finally {
      setLoadingBanners(false);
    }
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setEditTitle(banner.title ?? '');
    setEditDesc(banner.description ?? '');
    setEditLongDesc(banner.long_description ?? '');
    setEditImageUri(null);
    setEditAlign(banner.text_align ?? 'left');
    setEditSortOrder(String(banner.sort_order ?? ''));
    setEditModal(true);
  };

  const openAdd = () => {
    setNewTitle('');
    setNewDesc('');
    setNewLongDesc('');
    setNewImageUri(null);
    setNewAlign('left');
    setAddModal(true);
  };

  const pickImage = async (onPick: (uri: string) => void) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        onPick(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Image picker error', error?.message || 'Could not open image library.');
    }
  };

  const openBucketPicker = async (onPick: (url: string) => void) => {
    setBucketOnPick(() => onPick);
    setBucketModal(true);
    setLoadingBucket(true);
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      const images = (data ?? [])
        .filter((f) => f.name && /\.(jpg|jpeg|png|webp)$/i.test(f.name))
        .map((f) => ({
          name: f.name,
          url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(f.name).data.publicUrl,
        }));
      setBucketImages(images);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load bucket images.');
      setBucketModal(false);
    } finally {
      setLoadingBucket(false);
    }
  };

  const uploadImageToStorage = async (localUri: string, filePrefix: string) => {    const fileExt = 'jpg';
    const fileName = `${filePrefix}-${Date.now()}.${fileExt}`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    return publicUrl;
  };

  const deleteBanner = () => {
    if (!editing) return;
    Alert.alert('Remove banner', 'Are you sure you want to delete this banner?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('banners').delete().eq('id', editing.id);
          if (error) return Alert.alert('Error', error.message);
          setEditModal(false);
          setEditing(null);
          setEditImageUri(null);
          await fetchBanners();
        },
      },
    ]);
  };

  const saveChanges = async () => {
    if (!editing) return;

    if (!editTitle.trim()) {
      Alert.alert('Title required', 'Please enter a banner title.');
      return;
    }

    setSaving(true);

    try {
      let image_url = editing.image_url;

      if (editImageUri) {
        // If it's a remote URL from the bucket, use directly; otherwise upload
        if (editImageUri.startsWith('http')) {
          image_url = editImageUri;
        } else {
          image_url = await uploadImageToStorage(editImageUri, `banner-${editing.id}`);
        }
      }

      const { error } = await supabase
        .from('banners')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim(),
          long_description: editLongDesc.trim(),
          image_url,
          text_align: editAlign,
          sort_order: editSortOrder.trim() !== '' ? Number(editSortOrder) : editing.sort_order,
        })
        .eq('id', editing.id);

      if (error) throw error;

      setEditModal(false);
      setEditing(null);
      setEditImageUri(null);
      setEditLongDesc('');
      setEditSortOrder('');
      await fetchBanners();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Failed to save banner changes.');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = async () => {
    if (!newImageUri) {
      Alert.alert('Image required', 'Please select an image for the banner.');
      return;
    }

    if (!newTitle.trim()) {
      Alert.alert('Title required', 'Please enter a banner title.');
      return;
    }

    setAdding(true);

    try {
      // If it's already a remote URL from the bucket, use directly; otherwise upload
      const image_url = newImageUri.startsWith('http')
        ? newImageUri
        : await uploadImageToStorage(newImageUri, 'banner-new');

      const nextOrder =
        banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 1;

      const { error } = await supabase.from('banners').insert({
        title: newTitle.trim(),
        description: newDesc.trim(),
        long_description: newLongDesc.trim(),
        image_url,
        sort_order: nextOrder,
        text_align: newAlign,
        location_id: selectedLocationId,
      });

      if (error) throw error;

      setAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewLongDesc('');
      setNewImageUri(null);
      await fetchBanners();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Failed to upload banner.');
    } finally {
      setAdding(false);
    }
  };

  const renderBanner = ({ item }: { item: Banner }) => (
    <TouchableOpacity
      onPress={() => openEdit(item)}
      activeOpacity={0.85}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ height: 180 }}
    >
      <Image
        source={{ uri: item.image_url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          borderRadius: 16,
        }}
      />

      <View className="absolute top-3 right-3 bg-black-200 px-2 py-1 rounded-lg flex-row items-center">
        <Image
          source={icons.upload}
          className="w-3 h-3 mr-1"
          tintColor="#8ED1FC"
          resizeMode="contain"
        />
        <Text className="text-secondary font-pregular text-xs">Edit</Text>
      </View>

      <View
        className="absolute bottom-4 left-4 right-4"
        style={{ alignItems: item.text_align === 'right' ? 'flex-end' : 'flex-start' }}
      >
        <Text
          className="text-white font-psemibold text-xl"
          style={{ textAlign: item.text_align ?? 'left' }}
        >
          {item.title}
        </Text>
        <Text
          className="text-gray-100 font-pregular text-sm mt-0.5"
          style={{ textAlign: item.text_align ?? 'left' }}
        >
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        renderItem={renderBanner}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={() => (
          <View className="px-4 pt-6 pb-4">
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-gray-100 font-pregular text-sm">Welcome back,</Text>
                <Text className="text-white font-psemibold text-2xl">{userName}</Text>
              </View>

              <Image
                source={images.logoTopOneWhite}
                style={{ width: 160, height: 64 }}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              onPress={() => setLocationPickerVisible(true)}
              className="flex-row items-center bg-black-100 self-start px-4 py-2 rounded-full mb-5"
            >
              <Image
                source={icons.rightArrow}
                className="w-3 h-3 mr-2"
                tintColor="#8ED1FC"
                resizeMode="contain"
              />
              <Text className="text-secondary font-psemibold text-sm">{selectedLocationName || 'Select Location'}</Text>
            </TouchableOpacity>

            <Text className="text-white font-psemibold text-xl mb-3">What's on</Text>

            <TouchableOpacity
              onPress={openAdd}
              activeOpacity={0.8}
              className="bg-secondary rounded-2xl h-16 items-center justify-center flex-row mb-3"
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: 'rgba(22,22,34,0.2)' }}
              >
                <Text className="text-primary font-psemibold text-xl">+</Text>
              </View>
              <Text className="text-primary font-psemibold text-base">Add New Banner</Text>
            </TouchableOpacity>

            {loadingBanners && (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#8ED1FC" />
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={addModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
            <Text className="text-white font-psemibold text-xl mb-4">Add Banner</Text>

            <TouchableOpacity
              onPress={() => pickImage(setNewImageUri)}
              className="rounded-xl overflow-hidden mb-2 items-center justify-center bg-black-200"
              style={{ height: 140 }}
            >
              {newImageUri ? (
                <>
                  <Image
                    source={{ uri: newImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <View
                    className="absolute inset-0 items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                  >
                    <Image
                      source={icons.upload}
                      className="w-6 h-6 mb-1"
                      tintColor="#fff"
                      resizeMode="contain"
                    />
                    <Text className="text-white font-pregular text-sm">Tap to change</Text>
                  </View>
                </>
              ) : (
                <>
                  <Image
                    source={icons.upload}
                    className="w-8 h-8 mb-2"
                    tintColor="#8ED1FC"
                    resizeMode="contain"
                  />
                  <Text className="text-secondary font-pregular text-sm">
                    Tap to upload image
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openBucketPicker((url) => setNewImageUri(url))}
              className="bg-black-200 rounded-xl py-3 items-center mb-4 flex-row justify-center"
            >
              <Image source={icons.bookmark} className="w-4 h-4 mr-2" tintColor="#8ED1FC" resizeMode="contain" />
              <Text className="text-secondary font-pregular text-sm">Choose from uploads</Text>
            </TouchableOpacity>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Banner title"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Short description (shown on banner)"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <TextInput
              value={newLongDesc}
              onChangeText={setNewLongDesc}
              placeholder="Long description (shown when tapped in guest app)"
              placeholderTextColor="#7B7B8B"
              multiline
              numberOfLines={4}
              style={{ textAlignVertical: 'top' }}
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            {/* Text alignment toggle */}
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setNewAlign('left')}
                className="flex-1 py-3 rounded-xl mr-2 items-center"
                style={{ backgroundColor: newAlign === 'left' ? '#FF9C01' : '#1E1E2D' }}
              >
                <Text
                  className="font-psemibold text-sm"
                  style={{ color: newAlign === 'left' ? '#161622' : '#CDCDE0' }}
                >
                  Text Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewAlign('right')}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: newAlign === 'right' ? '#FF9C01' : '#1E1E2D' }}
              >
                <Text
                  className="font-psemibold text-sm"
                  style={{ color: newAlign === 'right' ? '#161622' : '#CDCDE0' }}
                >
                  Text Right
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={addBanner}
              disabled={adding}
              className="bg-secondary rounded-xl py-4 items-center mb-3"
            >
              {adding ? (
                <ActivityIndicator color="#161622" />
              ) : (
                <Text className="text-primary font-psemibold text-base">Upload Banner</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAddModal(false)} className="items-center py-2">
              <Text className="text-gray-100 font-pregular">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
            <Text className="text-white font-psemibold text-xl mb-4">Edit Banner</Text>

            <TouchableOpacity
              onPress={() => pickImage(setEditImageUri)}
              className="rounded-xl overflow-hidden mb-2"
              style={{ height: 140 }}
            >
              <Image
                source={
                  editImageUri
                    ? { uri: editImageUri }
                    : editing?.image_url
                    ? { uri: editing.image_url }
                    : images.logoTopOneWhite
                }
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              >
                <Image
                  source={icons.upload}
                  className="w-6 h-6 mb-1"
                  tintColor="#fff"
                  resizeMode="contain"
                />
                <Text className="text-white font-pregular text-sm">Tap to change image</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openBucketPicker((url) => setEditImageUri(url))}
              className="bg-black-200 rounded-xl py-3 items-center mb-4 flex-row justify-center"
            >
              <Image source={icons.bookmark} className="w-4 h-4 mr-2" tintColor="#8ED1FC" resizeMode="contain" />
              <Text className="text-secondary font-pregular text-sm">Choose from uploads</Text>
            </TouchableOpacity>

            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Banner title"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Short description (shown on banner)"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <TextInput
              value={editLongDesc}
              onChangeText={setEditLongDesc}
              placeholder="Long description (shown when tapped in guest app)"
              placeholderTextColor="#7B7B8B"
              multiline
              numberOfLines={4}
              style={{ textAlignVertical: 'top' }}
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">
              Sort order — lower number appears first (current: {editing?.sort_order})
            </Text>
            <TextInput
              value={editSortOrder}
              onChangeText={setEditSortOrder}
              placeholder={`Current: ${editing?.sort_order ?? ''}`}
              placeholderTextColor="#7B7B8B"
              keyboardType="numeric"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            {/* Text alignment toggle */}
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setEditAlign('left')}
                className="flex-1 py-3 rounded-xl mr-2 items-center"
                style={{ backgroundColor: editAlign === 'left' ? '#FF9C01' : '#1E1E2D' }}
              >
                <Text
                  className="font-psemibold text-sm"
                  style={{ color: editAlign === 'left' ? '#161622' : '#CDCDE0' }}
                >
                  Text Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditAlign('right')}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: editAlign === 'right' ? '#FF9C01' : '#1E1E2D' }}
              >
                <Text
                  className="font-psemibold text-sm"
                  style={{ color: editAlign === 'right' ? '#161622' : '#CDCDE0' }}
                >
                  Text Right
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={saveChanges}
              disabled={saving}
              className="bg-secondary rounded-xl py-4 items-center mb-3"
            >
              {saving ? (
                <ActivityIndicator color="#161622" />
              ) : (
                <Text className="text-primary font-psemibold text-base">Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={deleteBanner} className="items-center py-2 mb-1">
              <Text className="text-red-500 font-pregular">Delete Banner</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditModal(false)} className="items-center py-2">
              <Text className="text-gray-100 font-pregular">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Location picker modal */}
      <Modal
        visible={locationPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationPickerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: '#1E1E2D', borderRadius: 16, width: '100%', overflow: 'hidden' }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#232533' }}>
              <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold', fontSize: 16 }}>Select Location</Text>
            </View>
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLocation(item.id, item.name);
                    setLocationPickerVisible(false);
                  }}
                  style={{
                    padding: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: '#232533',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: item.id === selectedLocationId ? '#FFA001' : '#CDCDE0', fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>
                    {item.name}
                  </Text>
                  {item.id === selectedLocationId && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFA001' }} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => {
                setLocationPickerVisible(false);
                router.push('/(extras)/location');
              }}
              style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#232533' }}
            >
              <Text style={{ color: '#8ED1FC', fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>Manage Locations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLocationPickerVisible(false)}
              style={{ padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#7B7B8B', fontFamily: 'Poppins-Regular', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bucket image picker modal */}
      <Modal visible={bucketModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8" style={{ maxHeight: '75%' }}>
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
            <Text className="text-white font-psemibold text-xl mb-4">Choose from uploads</Text>

            {loadingBucket ? (
              <View className="py-16 items-center">
                <ActivityIndicator size="large" color="#8ED1FC" />
              </View>
            ) : bucketImages.length === 0 ? (
              <View className="py-16 items-center">
                <Text className="text-gray-100 font-pregular text-sm">No images found in bucket.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap">
                  {bucketImages.map((img) => (
                    <TouchableOpacity
                      key={img.name}
                      onPress={() => {
                        bucketOnPick?.(img.url);
                        setBucketModal(false);
                      }}
                      activeOpacity={0.8}
                      style={{ width: '31%', aspectRatio: 1, margin: '1.1%' }}
                      className="rounded-xl overflow-hidden"
                    >
                      <Image
                        source={{ uri: img.url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setBucketModal(false)}
              className="items-center py-3 mt-3"
            >
              <Text className="text-gray-100 font-pregular">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;