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
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { icons, images } from '../../constants';

const BUCKET = 'collection';
const SCREEN_WIDTH = Dimensions.get('window').width;
const DETAIL_COL_WIDTH = (SCREEN_WIDTH - 48) / 2;

type CollectionEntry = {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  category: string;
  image_url: string;
  sort_order: number;
  show_year: boolean;
};

type YearGroup = {
  year: string;
  title: string;
  subtitle: string;
  sort_order: number;
  show_year: boolean;
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
  const [lockedYear, setLockedYear] = useState<string | null>(null);
  const [lockedTitle, setLockedTitle] = useState<string | null>(null);

  // Bucket picker state
  const [bucketModal, setBucketModal] = useState(false);
  const [bucketImages, setBucketImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [bucketOnPick, setBucketOnPick] = useState<((url: string) => void) | null>(null);

  // Edit bundle
  const [editBundleModal, setEditBundleModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<YearGroup | null>(null);
  const [editBundleYear, setEditBundleYear] = useState('');
  const [editBundleTitle, setEditBundleTitle] = useState('');
  const [editBundleShowYear, setEditBundleShowYear] = useState(true);
  const [editBundleSubtitle, setEditBundleSubtitle] = useState('');
  const [editBundleSortOrder, setEditBundleSortOrder] = useState('');
  const [editBundleSaving, setEditBundleSaving] = useState(false);

  // Edit individual image
  const [editImageId, setEditImageId] = useState<string | null>(null);
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageSaving, setEditImageSaving] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, year, title, subtitle, category, image_url, sort_order, show_year')
        .order('year', { ascending: false });

      if (error) throw error;
      setEntries(data ?? []);
    } catch (err: any) {
      console.error('Error fetching collections:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group entries by title
  const yearGroups = useMemo<YearGroup[]>(() => {
    const map: Record<string, YearGroup> = {};
    for (const entry of entries) {
      const key = entry.title?.trim() || String(entry.year);
      if (!map[key]) {
        map[key] = { year: String(entry.year ?? ''), title: entry.title, subtitle: entry.subtitle, sort_order: entry.sort_order ?? 0, show_year: entry.show_year !== false, entries: [] };
      }
      map[key].entries.push(entry);
    }
    return Object.values(map).sort((a, b) => {
      const sa = a.sort_order ?? 0;
      const sb = b.sort_order ?? 0;
      if (sa !== sb) return sa - sb;
      const ta = (a.title || String(a.year ?? '')).toLowerCase();
      const tb = (b.title || String(b.year ?? '')).toLowerCase();
      return ta.localeCompare(tb);
    });
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

  const openBucketPicker = async (onPick: (url: string) => void) => {
    setBucketOnPick(() => onPick);
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
    if (!(newYear ?? '').trim()) return Alert.alert('Year required', 'Please enter a collection year.');
    if (!newTitle.trim()) return Alert.alert('Title required', 'Please enter a title.');
    if (!newImageUri) return Alert.alert('Image required', 'Please select an image.');

    setAdding(true);
    try {
      const image_url = newImageUri.startsWith('http')
        ? newImageUri
        : await uploadImage(newImageUri, (newYear ?? '').trim() || 'misc');
      const { error } = await supabase.from('collections').insert({
        year: (newYear ?? '').trim() || null,
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        category: newCategory,
        image_url,
      });
      if (error) throw error;

      // Optimistically update local state so the detail view refreshes instantly
      const newEntry: CollectionEntry = {
        id: Math.random().toString(), // temp id, will be replaced by fetchEntries
        year: (newYear ?? '').trim() || '',
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        category: newCategory,
        image_url,
        sort_order: 0,
        show_year: true,
      };
      setEntries(prev => [...prev, newEntry]);
      if (detailGroup) {
        setDetailGroup(prev => prev ? { ...prev, entries: [...prev.entries, newEntry] } : prev);
      }

      setAddModal(false);
      setNewYear(''); setNewTitle(''); setNewSubtitle('');
      setNewCategory('mens'); setNewImageUri(null); setShowNewYearInput(false); setLockedYear(null); setLockedTitle(null);
      fetchEntries(); // background refresh to get real id and sort_order
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

  const openEditBundle = (group: YearGroup) => {
    setEditingBundle(group);
    setEditBundleYear(String(group.year ?? ''));
    setEditBundleTitle(group.title ?? '');
    setEditBundleShowYear(group.show_year !== false);
    setEditBundleSubtitle(group.subtitle ?? '');
    setEditBundleSortOrder(group.sort_order != null ? String(group.sort_order) : '');
    setEditBundleModal(true);
  };

  const handleSaveBundle = async () => {
    if (!editingBundle) return;
    if (!editBundleTitle.trim()) return Alert.alert('Title required', 'Please enter a collection title.');
    setEditBundleSaving(true);
    try {
      const updates: Record<string, any> = {
        year: String(editBundleYear ?? '').trim(),
        title: editBundleTitle.trim(),
        subtitle: editBundleSubtitle.trim(),
        sort_order: editBundleSortOrder.trim() !== '' ? Number(editBundleSortOrder) : 0,
        show_year: editBundleShowYear,
      };
      const q = supabase.from('collections').update(updates);
      const { error } = editingBundle.title?.trim()
        ? await q.eq('title', editingBundle.title)
        : await q.eq('year', editingBundle.year);
      if (error) throw error;
      setEditBundleModal(false);
      if (detailGroup?.year === editingBundle.year) {
        setDetailGroup(prev => prev ? { ...prev, year: updates.year, title: updates.title, subtitle: updates.subtitle } : prev);
      }
      await fetchEntries();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not update bundle.');
    } finally {
      setEditBundleSaving(false);
    }
  };

  const handleDeleteBundle = () => {
    if (!editingBundle) return;
    Alert.alert(
      'Delete Bundle',
      `Delete the "${editingBundle.title || editingBundle.year}" bundle and all ${editingBundle.entries.length} images?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', style: 'destructive',
          onPress: async () => {
            const deleteQ = editingBundle.title?.trim()
              ? supabase.from('collections').delete().eq('title', editingBundle.title)
              : supabase.from('collections').delete().eq('year', editingBundle.year);
            const { error } = await deleteQ;
            if (error) return Alert.alert('Error', error.message);
            setEditBundleModal(false);
            setDetailGroup(null);
            await fetchEntries();
          },
        },
      ]
    );
  };

  const handleSaveImage = async () => {
    if (!editImageId || !editImageUri) return;
    setEditImageSaving(true);
    try {
      let image_url = editImageUri;
      if (!editImageUri.startsWith('http')) {
        const entry = entries.find(e => e.id === editImageId);
        image_url = await uploadImage(editImageUri, entry?.year ?? 'misc');
      }
      const { error } = await supabase.from('collections').update({ image_url }).eq('id', editImageId);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === editImageId ? { ...e, image_url } : e));
      if (detailGroup) {
        setDetailGroup(prev => prev ? {
          ...prev,
          entries: prev.entries.map(e => e.id === editImageId ? { ...e, image_url } : e),
        } : prev);
      }
      setEditImageId(null);
      setEditImageUri(null);
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not update image.');
    } finally {
      setEditImageSaving(false);
    }
  };

  // ─── Year Card ───────────────────────────────────────────────
  const renderYearCard = ({ item }: { item: YearGroup }) => (
    <TouchableOpacity
      onPress={() => setDetailGroup(item)}
      activeOpacity={0.85}
      style={styles.yearBundleCard}
    >
      <Image
        source={{ uri: item.entries[0]?.image_url }}
        style={styles.yearBundleImage}
        resizeMode="cover"
      />
      <View style={styles.yearBundleOverlay} />
      <View style={styles.yearBundleContent}>
        <Text style={styles.yearBundleTitle}>{item.title || item.year}</Text>
        {item.show_year !== false && !!item.year && (
          <Text style={styles.yearBundleSubtitle}>{item.year}</Text>
        )}
        {!!item.subtitle && (
          <Text style={styles.yearBundleSubtitle}>{item.subtitle}</Text>
        )}
        <Text style={styles.yearBundleMeta}>{item.entries.length} images</Text>
        <Text style={styles.yearBundleHint}>Tap to open this bundle</Text>
      </View>
      <TouchableOpacity
        onPress={() => openEditBundle(item)}
        style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(22,22,34,0.75)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Image source={icons.upload} style={{ width: 12, height: 12 }} tintColor="#8ED1FC" resizeMode="contain" />
        <Text style={{ color: '#8ED1FC', fontSize: 12, fontFamily: 'Poppins-Regular' }}>Edit</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="bg-primary flex-1">
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8ED1FC" />
        </View>
      ) : (
        <FlatList
          data={yearGroups}
          keyExtractor={g => g.title || g.year}
          renderItem={renderYearCard}
          numColumns={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Image source={icons.scissors} style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.4 }} tintColor="#CDCDE0" resizeMode="contain" />
              <Text style={{ color: '#CDCDE0', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
                No collections yet.{'\n'}Tap + to add your first image.
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View style={{ paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View>
                  <Text style={{ color: '#CDCDE0', fontSize: 13, fontFamily: 'Poppins-Regular' }}>Collection</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 24, fontFamily: 'Poppins-SemiBold', marginTop: 2 }}>Collections</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={images.logoTopOneWhite} style={{ width: 120, height: 52 }} resizeMode="contain" />
                  <TouchableOpacity
                    onPress={() => setAddModal(true)}
                    style={{ backgroundColor: '#FF9C01', borderRadius: 999, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Image source={icons.plus} style={{ width: 20, height: 20 }} tintColor="#161622" resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ color: '#CDCDE0', fontSize: 13, fontFamily: 'Poppins-Regular', marginBottom: 16, marginTop: 4 }}>
                Choose a collection to view all images in that bundle.
              </Text>
            </View>
          }
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
              <Text className="text-white font-psemibold text-2xl">{detailGroup?.title || detailGroup?.year}</Text>
              {(detailGroup?.year || detailGroup?.subtitle) ? (
                <Text className="text-gray-100 font-pregular text-sm" numberOfLines={1}>
                  {[detailGroup?.year, detailGroup?.subtitle].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
        onPress={() => { setLockedTitle(detailGroup!.title || null); setNewTitle(detailGroup!.title ?? ''); setLockedYear(detailGroup!.year ?? null); setNewYear(detailGroup!.year ?? ''); setShowNewYearInput(false); setAddModal(true); }}
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
                {/* Edit & Delete */}
                <View style={{ position: 'absolute', top: 8, right: 8, gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => { setEditImageId(item.id); setEditImageUri(null); }}
                    className="bg-black-200 w-7 h-7 rounded-full items-center justify-center"
                  >
                    <Image source={icons.upload} className="w-3 h-3" tintColor="#8ED1FC" resizeMode="contain" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    className="bg-black-200 w-7 h-7 rounded-full items-center justify-center"
                  >
                    <Image source={icons.logout} className="w-3 h-3" tintColor="#FF6B6B" resizeMode="contain" />
                  </TouchableOpacity>
                </View>
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
                onPress={() => openBucketPicker((url) => setNewImageUri(url))}
                className="bg-black-200 rounded-xl py-3 items-center mb-4 flex-row justify-center"
              >
                <Image source={icons.scissors} className="w-4 h-4 mr-2" tintColor="#8ED1FC" resizeMode="contain" />
                <Text className="text-secondary font-pregular text-sm">Choose from uploads</Text>
              </TouchableOpacity>

              {/* Collection selector */}
              <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">Collection</Text>
              {lockedTitle ? (
                <View className="bg-black-200 rounded-xl px-4 py-3 mb-3 flex-row items-center">
                  <Text className="text-white font-psemibold text-sm flex-1">{lockedTitle}</Text>
                  <Text className="text-gray-100 font-pregular text-xs">Auto-selected</Text>
                </View>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    <View className="flex-row">
                      {yearGroups.map((g) => {
                        const label = g.title || g.year;
                        const selected = newTitle === g.title && !!g.title && !showNewYearInput;
                        return (
                          <TouchableOpacity
                            key={label}
                            onPress={() => { setNewTitle(g.title); setNewYear(g.year ?? ''); setShowNewYearInput(false); }}
                            className="py-2 px-4 rounded-xl mr-2 items-center justify-center"
                            style={{ backgroundColor: selected ? '#FF9C01' : '#1E1E2D' }}
                          >
                            <Text
                              className="font-psemibold text-sm"
                              style={{ color: selected ? '#161622' : '#CDCDE0' }}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        onPress={() => { setShowNewYearInput(true); setNewTitle(''); setNewYear(''); }}
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
                    <>
                      <TextInput
                        value={newTitle}
                        onChangeText={setNewTitle}
                        placeholder="Collection title"
                        placeholderTextColor="#7B7B8B"
                        className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
                      />
                      <TextInput
                        value={newYear}
                        onChangeText={setNewYear}
                        placeholder="Year (e.g. 2025)"
                        placeholderTextColor="#7B7B8B"
                        keyboardType="numeric"
                        className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
                      />
                    </>
                  )}
                </>
              )}

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
                  setNewCategory('mens'); setNewImageUri(null); setShowNewYearInput(false); setLockedYear(null); setLockedTitle(null);
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

      {/* ─── Edit Bundle Modal ─────────────────────────────── */}
      <Modal visible={editBundleModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
            <Text className="text-white font-psemibold text-xl mb-4">Edit Bundle</Text>

            <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">Title (main display text)</Text>
            <TextInput
              value={editBundleTitle}
              onChangeText={setEditBundleTitle}
              placeholder="Collection title"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text className="text-gray-100 font-pregular text-xs ml-1">Year</Text>
              <TouchableOpacity
                onPress={() => setEditBundleShowYear(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8,
                  backgroundColor: editBundleShowYear ? '#0f2b1a' : '#1E1E2D',
                  borderWidth: 1, borderColor: editBundleShowYear ? '#4ade80' : '#555568' }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 1.5,
                  borderColor: editBundleShowYear ? '#4ade80' : '#7B7B8B',
                  backgroundColor: editBundleShowYear ? '#4ade80' : 'transparent',
                  alignItems: 'center', justifyContent: 'center' }}
                >
                  {editBundleShowYear && <Text style={{ color: '#161622', fontSize: 9, fontWeight: '700', lineHeight: 12 }}>✓</Text>}
                </View>
                <Text style={{ color: editBundleShowYear ? '#4ade80' : '#7B7B8B', fontSize: 12, fontFamily: 'Poppins-Regular' }}>
                  {editBundleShowYear ? 'Shown' : 'Hidden'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={editBundleYear}
              onChangeText={setEditBundleYear}
              placeholder="e.g. 2025"
              placeholderTextColor="#7B7B8B"
              keyboardType="numeric"
              editable={editBundleShowYear}
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              style={{ opacity: editBundleShowYear ? 1 : 0.4 }}
            />

            <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">Subtitle</Text>
            <TextInput
              value={editBundleSubtitle}
              onChangeText={setEditBundleSubtitle}
              placeholder="Subtitle (optional)"
              placeholderTextColor="#7B7B8B"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
            />

            <Text className="text-gray-100 font-pregular text-xs mb-2 ml-1">Sort order — lower appears first</Text>
            <TextInput
              value={editBundleSortOrder}
              onChangeText={setEditBundleSortOrder}
              placeholder="e.g. 1, 2, 3 ..."
              placeholderTextColor="#7B7B8B"
              keyboardType="numeric"
              className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-4"
            />

            <TouchableOpacity
              onPress={handleSaveBundle}
              disabled={editBundleSaving}
              className="bg-secondary rounded-xl py-4 items-center mb-3"
            >
              {editBundleSaving ? (
                <ActivityIndicator color="#161622" />
              ) : (
                <Text className="text-primary font-psemibold text-base">Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteBundle} className="items-center py-2 mb-1">
              <Text className="text-red-500 font-pregular">Delete Bundle</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditBundleModal(false)} className="items-center py-2">
              <Text className="text-gray-100 font-pregular">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Edit Image Modal ──────────────────────────────── */}
      {editImageId !== null && (
        <Modal visible={true} transparent animationType="slide">
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
              <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
              <Text className="text-white font-psemibold text-xl mb-4">Replace Image</Text>

              <TouchableOpacity
                onPress={() => pickImage(setEditImageUri)}
                className="rounded-xl overflow-hidden mb-2 items-center justify-center bg-black-200"
                style={{ height: 160 }}
              >
                <Image
                  source={{ uri: editImageUri ?? entries.find(e => e.id === editImageId)?.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                  <Image source={icons.upload} className="w-6 h-6 mb-1" tintColor="#fff" resizeMode="contain" />
                  <Text className="text-white font-pregular text-sm">{editImageUri ? 'Tap to change' : 'Tap to replace'}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openBucketPicker((url) => setEditImageUri(url))}
                className="bg-black-200 rounded-xl py-3 items-center mb-4 flex-row justify-center"
              >
                <Image source={icons.scissors} className="w-4 h-4 mr-2" tintColor="#8ED1FC" resizeMode="contain" />
                <Text className="text-secondary font-pregular text-sm">Choose from uploads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveImage}
                disabled={!editImageUri || editImageSaving}
                className="rounded-xl py-4 items-center mb-3"
                style={{ backgroundColor: editImageUri ? '#FF9C01' : '#1E1E2D' }}
              >
                {editImageSaving ? (
                  <ActivityIndicator color="#161622" />
                ) : (
                  <Text className="font-psemibold text-base" style={{ color: editImageUri ? '#161622' : '#7B7B8B' }}>Save Image</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setEditImageId(null); setEditImageUri(null); }}
                className="items-center py-2"
              >
                <Text className="text-gray-100 font-pregular">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  yearBundleCard: {
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 20,
    borderWidth: 1,
    height: 180,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  yearBundleImage: {
    height: '100%',
    width: '100%',
  },
  yearBundleOverlay: {
    backgroundColor: 'rgba(7, 11, 19, 0.55)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  yearBundleContent: {
    bottom: 18,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  yearBundleTitle: {
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
  },
  yearBundleSubtitle: {
    color: '#CDCDE0',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  yearBundleMeta: {
    color: '#8ED1FC',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  yearBundleHint: {
    color: '#CDCDE0',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 8,
  },
});

export default Collections;