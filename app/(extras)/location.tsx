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
  Switch,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images, icons } from '../../constants';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type LocationItem = {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  opening_hours: string;
  image_url: string;
  sort_order: number;
};

type DaySchedule = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultSchedule = (): DaySchedule[] =>
  DAY_NAMES.map((_, i) => ({ day_of_week: i, open_time: '09:00', close_time: '18:00', is_closed: false }));

const STORAGE_BUCKET = 'images';

const Location = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<LocationItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOpenHours, setEditOpenHours] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newAddress2, setNewAddress2] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOpenHours, setNewOpenHours] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Bucket picker
  const [bucketModal, setBucketModal] = useState(false);
  const [bucketImages, setBucketImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [bucketOnPick, setBucketOnPick] = useState<((url: string) => void) | null>(null);

  // Opening times
  const [editSchedule, setEditSchedule] = useState<DaySchedule[]>(defaultSchedule());
  const [newSchedule, setNewSchedule] = useState<DaySchedule[]>(defaultSchedule());

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address_line_1, address_line_2, postcode, country, phone, email, opening_hours, image_url, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setLocations(data ?? []);
    } catch (err: any) {
      console.error('Error fetching locations:', err.message);
    } finally {
      setLoading(false);
    }
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
      const imgs = (data ?? [])
        .filter((f) => f.id != null)
        .map((f) => ({
          name: f.name,
          url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(f.name).data.publicUrl,
        }));
      setBucketImages(imgs);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load bucket images.');
      setBucketModal(false);
    } finally {
      setLoadingBucket(false);
    }
  };

  const uploadImage = async (localUri: string, prefix: string) => {
    const fileName = `${prefix}-${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;
  };

  const fetchOpeningTimes = async (locationId: string): Promise<DaySchedule[]> => {
    const { data, error } = await supabase
      .from('opening_times')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('location_id', locationId)
      .order('day_of_week', { ascending: true });
    if (error || !data || data.length === 0) return defaultSchedule();
    const base = defaultSchedule();
    data.forEach((row) => {
      const idx = row.day_of_week;
      if (idx >= 0 && idx < 7) {
        base[idx] = {
          day_of_week: row.day_of_week,
          open_time: row.open_time ?? '09:00',
          close_time: row.close_time ?? '18:00',
          is_closed: row.is_closed ?? false,
        };
      }
    });
    return base;
  };

  const saveOpeningTimes = async (locationId: string, schedule: DaySchedule[]) => {
    const rows = schedule.map((d) => ({
      location_id: locationId,
      day_of_week: d.day_of_week,
      open_time: d.open_time,
      close_time: d.close_time,
      is_closed: d.is_closed,
    }));
    const { error } = await supabase
      .from('opening_times')
      .upsert(rows, { onConflict: 'location_id,day_of_week' });
    if (error) throw error;
  };

  const openEdit = async (item: LocationItem) => {
    setEditing(item);
    setEditName(item.name ?? '');
    setEditAddress(item.address_line_1 ?? '');
    setEditAddress2(item.address_line_2 ?? '');
    setEditPostcode(item.postcode ?? '');
    setEditCountry(item.country ?? '');
    setEditPhone(item.phone ?? '');
    setEditEmail(item.email ?? '');
    setEditOpenHours(item.opening_hours ?? '');
    setEditImageUri(null);
    const schedule = await fetchOpeningTimes(item.id);
    setEditSchedule(schedule);
    setEditModal(true);
  };

  const saveChanges = async () => {
    if (!editing) return;
    if (!editName.trim()) return Alert.alert('Name required', 'Please enter a name.');
    setSaving(true);
    try {
      let image_url = editing.image_url;
      if (editImageUri) {
        image_url = editImageUri.startsWith('http')
          ? editImageUri
          : await uploadImage(editImageUri, `location-${editing.id}`);
      }
      const { error } = await supabase
        .from('locations')
        .update({
          name: editName.trim(),
          address_line_1: editAddress.trim(),
          address_line_2: editAddress2.trim(),
          postcode: editPostcode.trim(),
          country: editCountry.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          opening_hours: editOpenHours.trim(),
          image_url,
        })
        .eq('id', editing.id);
      if (error) throw error;
      await saveOpeningTimes(editing.id, editSchedule);
      setEditModal(false);
      setEditing(null);
      setEditImageUri(null);
      setEditAddress2('');
      setEditPostcode('');
      setEditCountry('');
      setEditPhone('');
      setEditEmail('');
      setEditOpenHours('');
      await fetchLocations();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = () => {
    if (!editing) return;
    Alert.alert('Remove location', 'Are you sure you want to delete this location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('locations').delete().eq('id', editing.id);
          if (error) return Alert.alert('Error', error.message);
          setEditModal(false);
          setEditing(null);
          setEditImageUri(null);
          setEditAddress2('');
          setEditPostcode('');
          setEditCountry('');
          setEditPhone('');
          setEditEmail('');
          setEditOpenHours('');
          await fetchLocations();
        },
      },
    ]);
  };

  const addLocation = async () => {
    if (!newName.trim()) return Alert.alert('Name required', 'Please enter a name.');
    if (!newImageUri) return Alert.alert('Image required', 'Please select an image.');
    setAdding(true);
    try {
      const image_url = newImageUri.startsWith('http')
        ? newImageUri
        : await uploadImage(newImageUri, 'location-new');
      const nextOrder =
        locations.length > 0 ? Math.max(...locations.map((l) => l.sort_order)) + 1 : 1;
      const { error } = await supabase.from('locations').insert({
        name: newName.trim(),
        address_line_1: newAddress.trim(),
        address_line_2: newAddress2.trim(),
        postcode: newPostcode.trim(),
        country: newCountry.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        opening_hours: newOpenHours.trim(),
        image_url,
        sort_order: nextOrder,
      });
      if (error) throw error;
      // fetch the new location id to save opening times
      const { data: inserted } = await supabase
        .from('locations')
        .select('id')
        .eq('name', newName.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (inserted?.id) await saveOpeningTimes(inserted.id, newSchedule);
      setAddModal(false);
      setNewName('');
      setNewAddress('');
      setNewAddress2('');
      setNewPostcode('');
      setNewCountry('');
      setNewPhone('');
      setNewEmail('');
      setNewOpenHours('');
      setNewImageUri(null);
      setNewSchedule(defaultSchedule());
      await fetchLocations();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Failed to add location.');
    } finally {
      setAdding(false);
    }
  };

  const updateScheduleDay = (schedule: DaySchedule[], setSchedule: (s: DaySchedule[]) => void, dayIndex: number, field: keyof DaySchedule, value: any) => {
    const updated = schedule.map((d) => d.day_of_week === dayIndex ? { ...d, [field]: value } : d);
    setSchedule(updated);
  };

  const renderScheduleEditor = (schedule: DaySchedule[], setSchedule: (s: DaySchedule[]) => void) => (
    <View className="mb-4">
      <Text className="text-white font-psemibold text-base mb-3">Opening Hours</Text>
      {schedule.map((day) => (
        <View key={day.day_of_week} className="mb-3 bg-black-200 rounded-xl px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-psemibold text-sm">{DAY_NAMES[day.day_of_week]}</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-100 font-pregular text-xs mr-2">
                {day.is_closed ? 'Closed' : 'Open'}
              </Text>
              <Switch
                value={!day.is_closed}
                onValueChange={(val) => updateScheduleDay(schedule, setSchedule, day.day_of_week, 'is_closed', !val)}
                trackColor={{ false: '#444', true: '#8ED1FC' }}
                thumbColor={day.is_closed ? '#888' : '#161622'}
              />
            </View>
          </View>
          {!day.is_closed && (
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <Text className="text-gray-100 font-pregular text-xs mb-1">Open</Text>
                <TextInput
                  value={day.open_time}
                  onChangeText={(v) => updateScheduleDay(schedule, setSchedule, day.day_of_week, 'open_time', v)}
                  placeholder="09:00"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white font-pregular rounded-lg px-3 py-2 text-sm"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-100 font-pregular text-xs mb-1">Close</Text>
                <TextInput
                  value={day.close_time}
                  onChangeText={(v) => updateScheduleDay(schedule, setSchedule, day.day_of_week, 'close_time', v)}
                  placeholder="18:00"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white font-pregular rounded-lg px-3 py-2 text-sm"
                />
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderLocation = ({ item }: { item: LocationItem }) => (
    <TouchableOpacity
      onPress={() => openEdit(item)}
      activeOpacity={0.85}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ height: 200 }}
    >
      <Image
        source={{ uri: item.image_url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16,
        }}
      />
      <View className="absolute top-3 right-3 bg-black-200 px-2 py-1 rounded-lg flex-row items-center">
        <Image source={icons.upload} className="w-3 h-3 mr-1" tintColor="#8ED1FC" resizeMode="contain" />
        <Text className="text-secondary font-pregular text-xs">Edit</Text>
      </View>
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <Text className="text-white font-psemibold text-2xl">{item.name}</Text>
        {!!item.address_line_1 && (
          <Text className="text-gray-100 font-pregular text-sm mt-1">{item.address_line_1}</Text>
        )}
        {!!item.postcode && (
          <Text className="text-gray-100 font-pregular text-sm">{item.postcode}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocation}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={() => (
          <View className="px-4 pt-6 pb-4">
            <View className="items-center mb-6">
              <Image
                source={images.logoTopOneWhite}
                style={{ width: 160, height: 64 }}
                resizeMode="contain"
              />
            </View>

            <Text className="text-white font-psemibold text-2xl mb-4">Locations</Text>

            <TouchableOpacity
              onPress={() => setAddModal(true)}
              activeOpacity={0.8}
              className="bg-secondary rounded-2xl h-16 items-center justify-center flex-row mb-3"
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: 'rgba(22,22,34,0.2)' }}
              >
                <Text className="text-primary font-psemibold text-xl">+</Text>
              </View>
              <Text className="text-primary font-psemibold text-base">Add New Location</Text>
            </TouchableOpacity>

            {loading && (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#8ED1FC" />
              </View>
            )}
          </View>
        )}
      />

      
      <Modal visible={addModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl pt-5" style={{ maxHeight: '92%' }}>
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-3" />
            <Text className="text-white font-psemibold text-xl px-5 mb-4">Add Location</Text>
            <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

              <TouchableOpacity
                onPress={() => pickImage(setNewImageUri)}
                className="rounded-xl overflow-hidden mb-2 items-center justify-center bg-black-200"
                style={{ height: 140 }}
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
                    <Text className="text-secondary font-pregular text-sm">Tap to upload image</Text>
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
                value={newName}
                onChangeText={setNewName}
                placeholder="Location name"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Address line 1"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newAddress2}
                onChangeText={setNewAddress2}
                placeholder="Address line 2 (optional)"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newPostcode}
                onChangeText={setNewPostcode}
                placeholder="Postcode"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newCountry}
                onChangeText={setNewCountry}
                placeholder="Country"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Phone"
                placeholderTextColor="#7B7B8B"
                keyboardType="phone-pad"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Email"
                placeholderTextColor="#7B7B8B"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-4"
              />

              {renderScheduleEditor(newSchedule, setNewSchedule)}

              <TouchableOpacity
                onPress={addLocation}
                disabled={adding}
                className="bg-secondary rounded-xl py-4 items-center mb-3"
              >
                {adding ? (
                  <ActivityIndicator color="#161622" />
                ) : (
                  <Text className="text-primary font-psemibold text-base">Add Location</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setAddModal(false)} className="items-center py-2">
                <Text className="text-gray-100 font-pregular">Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

     
      <Modal visible={editModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-black-100 rounded-t-2xl pt-5" style={{ maxHeight: '92%' }}>
            <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-3" />
            <Text className="text-white font-psemibold text-xl px-5 mb-4">Edit Location</Text>
            <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

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
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <Image source={icons.upload} className="w-6 h-6 mb-1" tintColor="#fff" resizeMode="contain" />
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
                value={editName}
                onChangeText={setEditName}
                placeholder="Location name"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Address line 1"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editAddress2}
                onChangeText={setEditAddress2}
                placeholder="Address line 2 (optional)"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editPostcode}
                onChangeText={setEditPostcode}
                placeholder="Postcode"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editCountry}
                onChangeText={setEditCountry}
                placeholder="Country"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#7B7B8B"
                keyboardType="phone-pad"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor="#7B7B8B"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-4"
              />

              {renderScheduleEditor(editSchedule, setEditSchedule)}

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

              <TouchableOpacity onPress={deleteLocation} className="items-center py-2 mb-1">
                <Text className="text-red-500 font-pregular">Delete Location</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditModal(false)} className="items-center py-2">
                <Text className="text-gray-100 font-pregular">Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

     
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
                      <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setBucketModal(false)} className="items-center py-3 mt-3">
              <Text className="text-gray-100 font-pregular">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Location;
