import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { icons, images } from '../../constants';

const BUCKET = 'collection';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
const DETAIL_COL_WIDTH = (SCREEN_WIDTH - 48) / 2;

type CollectionEntry = {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  category: string;
  image_url: string;
};

type YearGroup = {
  year: string;
  title: string;
  subtitle: string;
  entries: CollectionEntry[];
};

const CATEGORIES = ['mens', 'ladies'];

const Collections = () => {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [detailGroup, setDetailGroup] = useState<YearGroup | null>(null);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState('mens');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showNewYearInput, setShowNewYearInput] = useState(false);

  // Bucket picker state
  const [bucketModal, setBucketModal] = useState(false);
  const [bucketImages, setBucketImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, year, title, subtitle, category, image_url')
        .order('year', { ascending: false });

      if (error) throw error;
      setEntries(data ?? []);
    } catch (err: any) {
      console.error('Error fetching collections:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group entries by year
  const yearGroups = useMemo<YearGroup[]>(() => {
    const map: Record<string, YearGroup> = {};
    for (const entry of entries) {
      const yr = String(entry.year);
      if (!map[yr]) {
        map[yr] = { year: yr, title: entry.title, subtitle: entry.subtitle, entries: [] };
      }
      map[yr].entries.push(entry);
    }
    return Object.values(map).sort((a, b) => Number(b.year) - Number(a.year));
  }, [entries]);

  const pickImage = async (onPick: (uri: string) => void) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onPick(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open image library.');
    }
  };

  const openBucketPicker = async () => {
    setBucketModal(true);
    setLoadingBucket(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;

      const images = (data ?? [])
        .filter((f) => f.id != null) // exclude folder placeholders
        .map((f) => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        }));

      setBucketImages(images);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load bucket images.');
      setBucketModal(false);
    } finally {
      setLoadingBucket(false);
    }
  };

  const uploadImage = async (localUri: string, year: string) => {    const fileName = `${year}/${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
  };

  const handleAdd = async () => {
    if (!newYear.trim()) return Alert.alert('Year required', 'Please enter a collection year.');
    if (!newTitle.trim()) return Alert.alert('Title required', 'Please enter a title.');
    if (!newImageUri) return Alert.alert('Image required', 'Please select an image.');

    setAdding(true);
    try {
      const image_url = newImageUri.startsWith('http')
        ? newImageUri
        : await uploadImage(newImageUri, newYear.trim());
      const { error } = await supabase.from('collections').insert({
        year: newYear.trim(),
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        category: newCategory,
        image_url,
      });
      if (error) throw error;
      setAddModal(false);
      setNewYear(''); setNewTitle(''); setNewSubtitle('');
      setNewCategory('mens'); setNewImageUri(null); setShowNewYearInput(false);
      await fetchEntries();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not add image.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove image', 'Remove this image from the collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('collections').delete().eq('id', id);
          if (error) return Alert.alert('Error', error.message);
          setEntries(prev => prev.filter(e => e.id !== id));
          if (detailGroup) {
            const updated = detailGroup.entries.filter(e => e.id !== id);
            if (updated.length === 0) setDetailGroup(null);
            else setDetailGroup({ ...detailGroup, entries: updated });
          }
        },
      },
    ]);
  };

  // ─── Year Card ───────────────────────────────────────────────
  const renderYearCard = ({ item }: { item: YearGroup }) => {
    const previews = item.entries.slice(0, 4);
    return (
      <TouchableOpacity
        onPress={() => setDetailGroup(item)}
        activeOpacity={0.85}
        style={{ width: CARD_WIDTH, margin: 8 }}
        className="rounded-2xl overflow-hidden bg-black-100"
      >
        {/* 2×2 collage preview */}
        <View style={{ height: CARD_WIDTH * 0.9 }} className="flex-row flex-wrap">
          {previews.map((e, i) => (
            <Image
              key={e.id}
              source={{ uri: e.image_url }}
              style={{ width: '50%', height: '50%' }}
              resizeMode="cover"
            />
          ))}
          {previews.length < 4 &&
            Array.from({ length: 4 - previews.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: '50%', height: '50%' }} className="bg-black-200" />
            ))}
        </View>
        {/* Year overlay */}
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' }}
        />
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-white font-psemibold" style={{ fontSize: 36 }}>{item.year}</Text>
          <Text className="text-gray-100 font-pregular text-xs mt-0.5" numberOfLines={1}>{item.title}</Text>
        </View>
        {/* Image count badge */}
        <View className="absolute top-2 right-2 bg-black-200 px-2 py-0.5 rounded-full">
          <Text className="text-secondary font-pregular text-xs">{item.entries.length} photos</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="bg-primary flex-1">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <View className="items-center mb-4">
          <Image
            source={images.logoTopOneWhite}
            style={{ width: 160, height: 64 }}
            resizeMode="contain"
          />
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-2xl font-psemibold">Collections</Text>
          <TouchableOpacity
            onPress={() => setAddModal(true)}
            className="bg-secondary rounded-full w-10 h-10 items-center justify-center"
          >
            <Image source={icons.plus} className="w-5 h-5" tintColor="#161622" resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8ED1FC" />
        </View>
      ) : yearGroups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Image source={icons.scissors} className="w-16 h-16 mb-4 opacity-50" tintColor="#CDCDE0" resizeMode="contain" />
          <Text className="text-gray-100 text-base font-pregular text-center">
            No collections yet.{'\n'}Tap + to add your first image.
          </Text>
        </View>
      ) : (
        <FlatList
          data={yearGroups}
          keyExtractor={g => g.year}
          renderItem={renderYearCard}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ─── Detail Modal ─────────────────────────────────────── */}
      <Modal visible={!!detailGroup} animationType="slide">
        <SafeAreaView className="bg-primary flex-1">
          {/* Detail header */}
          <View className="px-4 pt-4 pb-3 flex-row items-center">
            <TouchableOpacity onPress={() => setDetailGroup(null)} className="mr-3">
              <Image source={icons.leftArrow} className="w-6 h-6" tintColor="#CDCDE0" resizeMode="contain" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-psemibold text-2xl">{detailGroup?.year}</Text>
              {detailGroup?.title ? (
                <Text className="text-gray-100 font-pregular text-sm" numberOfLines={1}>
                  {detailGroup.title}{detailGroup.subtitle ? ` · ${detailGroup.subtitle}` : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setAddModal(true)}
              className="bg-secondary rounded-full w-9 h-9 items-center justify-center"
            >
              <Image source={icons.plus} className="w-4 h-4" tintColor="#161622" resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={detailGroup?.entries ?? []}
            keyExtractor={e => e.id}
            numColumns={2}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={{ width: DETAIL_COL_WIDTH, margin: 8, aspectRatio: 0.75 }}
                className="rounded-2xl overflow-hidden bg-black-100"
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {/* Category badge */}
                <View
                  className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: item.category?.toLowerCase() === 'ladies' ? '#FF6BBB44' : '#4B8BFF44' }}
                >
                  <Text className="text-white font-pregular text-xs">{item.category}</Text>
                </View>
                {/* Delete */}
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 bg-black-200 w-7 h-7 rounded-full items-center justify-center"
                >
                  <Image source={icons.logout} className="w-3 h-3" tintColor="#FF6B6B" resizeMode="contain" />
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ─── Add Image Modal ──────────────────────────────────── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          >
            <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
              <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
              <Text className="text-white font-psemibold text-xl mb-4">Add Collection Image</Text>

              {/* Image picker */}
              <TouchableOpacity
                onPress={() => pickImage(setNewImageUri)}
                className="rounded-xl overflow-hidden mb-2 items-center justify-center bg-black-200"
                style={{ height: 160 }}
              >
                {newImageUri ? (
                  <>
                    <Image source={{ uri: newImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
                      <Image source={icons.upload} className="w-6 h-6 mb-1" tintColor="#fff" resizeMode="contain" />
                      <Text className="text-white font-pregular text-sm">Tap to change</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Image source={icons.upload} className="w-8 h-8 mb-2" tintColor="#8ED1FC" resizeMode="contain" />
                    <Text className="text-secondary font-pregular text-sm">Tap to select image</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openBucketPicker}
                className="bg-black-200 rounded-xl py-3 items-center mb-4 flex-row justify-center"
              >
                <Image source={icons.scissors} className="w-4 h-4 mr-2" tintColor="#8ED1FC" resizeMode="contain" />
                <Text className="text-secondary font-pregular text-sm">Choose from uploads</Text>
              </TouchableOpacity>

              {/* Year selector */}
              <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row">
                  {yearGroups.map((g) => (
                    <TouchableOpacity
                      key={g.year}
                      onPress={() => { setNewYear(g.year); setShowNewYearInput(false); }}
                      className="py-2 px-4 rounded-xl mr-2 items-center justify-center"
                      style={{ backgroundColor: newYear === g.year && !showNewYearInput ? '#FF9C01' : '#1E1E2D' }}
                    >
                      <Text
                        className="font-psemibold text-sm"
                        style={{ color: newYear === g.year && !showNewYearInput ? '#161622' : '#CDCDE0' }}
                      >
                        {g.year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => { setShowNewYearInput(true); setNewYear(''); }}
                    className="py-2 px-4 rounded-xl items-center justify-center"
                    style={{ backgroundColor: showNewYearInput ? '#FF9C01' : '#1E1E2D' }}
                  >
                    <Text
                      className="font-psemibold text-sm"
                      style={{ color: showNewYearInput ? '#161622' : '#CDCDE0' }}
                    >
                      + New
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              {showNewYearInput && (
                <TextInput
                  value={newYear}
                  onChangeText={setNewYear}
                  placeholder="Enter year (e.g. 2025)"
                  placeholderTextColor="#7B7B8B"
                  keyboardType="numeric"
                  className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
                />
              )}

              {/* Title */}
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Collection title"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />

              {/* Subtitle */}
              <TextInput
                value={newSubtitle}
                onChangeText={setNewSubtitle}
                placeholder="Subtitle (optional)"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />

              {/* Category toggle */}
              <View className="flex-row mb-4">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    className="flex-1 py-3 rounded-xl items-center mr-2 last:mr-0"
                    style={{ backgroundColor: newCategory === cat ? '#FF9C01' : '#1E1E2D' }}
                  >
                    <Text
                      className="font-psemibold text-sm"
                      style={{ color: newCategory === cat ? '#161622' : '#CDCDE0' }}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleAdd}
                disabled={adding}
                className="bg-secondary rounded-xl py-4 items-center mb-3"
              >
                {adding ? (
                  <ActivityIndicator color="#161622" />
                ) : (
                  <Text className="text-primary font-psemibold text-base">Add to Collection</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setAddModal(false);
                  setNewYear(''); setNewTitle(''); setNewSubtitle('');
                  setNewCategory('mens'); setNewImageUri(null); setShowNewYearInput(false);
                }}
                className="items-center py-2"
              >
                <Text className="text-gray-100 font-pregular">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Bucket Picker Modal */}
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
                        setNewImageUri(img.url);
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

export default Collections;