import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Text, Alert, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import CategorySelector from '../../components/CategorySelector';
import ServiceList from '../../components/ServiceList';
import AddServiceForm from '../../components/AddServiceForm';
import RolesModal from '../../components/RolesModal';
import { images, icons } from '../../constants';
import { useLocation } from '../../context/LocationContext';

const Services = () => {
  const { selectedLocationId, selectedLocationName, locations, setSelectedLocation } = useLocation();
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('Cuts');
  const [servicesData, setServicesData] = useState<Record<string, any[]>>({});
  const [selectedService, setSelectedService] = useState(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mainCategory, setMainCategory] = useState('Cuts');
  const [service, setService] = useState('');
  const [price, setPrice] = useState('');
  const [role, setRole] = useState('');
  const [duration, setDuration] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editService, setEditService] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editMainCategory, setEditMainCategory] = useState('');

  useEffect(() => {
    if (selectedLocationId) {
      fetchServices();
      setSelectedCategory('Cuts');
      setServicesData({});
    }
  }, [selectedLocationId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, main_category, service, role, price, duration')
        .eq('location_id', selectedLocationId);

      if (error) { console.error(error); return; }

      const organizedData = data.reduce((acc: Record<string, any[]>, item: any) => {
        const { main_category, service: serviceName, role, price, duration, id } = item;
        if (!acc[main_category]) acc[main_category] = [];
        const existingGroup = acc[main_category].find((g: any) => g.service === serviceName);
        if (existingGroup) {
          existingGroup.roles.push({ role, price, id });
        } else {
          acc[main_category].push({ service: serviceName, mainCategory: main_category, duration, roles: [{ role, price, id }] });
        }
        return acc;
      }, {});

      setServicesData(organizedData);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetails = (group: any) => {
    setSelectedService(group);
    setShowRolesModal(true);
  };

  const handleAddService = async () => {
    if (!service || !price || !role || !duration) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('services').insert([{
        main_category: mainCategory,
        service,
        price: Number(price),
        role,
        duration: Number(duration),
        location_id: selectedLocationId,
      }]);
      if (error) { Alert.alert('Error', 'Could not add service.'); return; }
      Alert.alert('Success', 'Service added.');
      setService(''); setPrice(''); setRole(''); setDuration('');
      setShowAddForm(false);
      await fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditRole = (roleItem: any, serviceName: string, mainCat: string, serviceDuration?: number) => {
    setEditingId(roleItem.id);
    setEditService(serviceName);
    setEditPrice(String(roleItem.price));
    setEditRole(roleItem.role);
    setEditDuration(String(serviceDuration ?? ''));
    setEditMainCategory(mainCat);
    setShowRolesModal(false);
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editService.trim() || !editPrice || !editRole.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    try {
      setLoading(true);
      // Update this specific role row (service name, price, role, category)
      const { error } = await supabase.from('services').update({
        service: editService.trim(),
        price: Number(editPrice),
        role: editRole.trim(),
        main_category: editMainCategory,
      }).eq('id', editingId);
      if (error) { Alert.alert('Error', 'Could not save changes.'); return; }
      // Update duration for ALL rows of this service at this location
      await supabase.from('services').update({ duration: Number(editDuration) || 0 })
        .eq('service', editService.trim())
        .eq('location_id', selectedLocationId);
      setEditModal(false);
      await fetchServices();
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase.from('services').delete().eq('id', roleId);
    if (error) { console.error('Error deleting role:', error); return; }
    await fetchServices();
    setSelectedService((prev: any) => prev ? {
      ...prev,
      roles: prev.roles.filter((r: any) => r.id !== roleId),
    } : prev);
  };

  const handleDeleteService = async (group: any) => {
    Alert.alert(
      'Delete Service',
      `Delete "${group.service}" and all its options?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase
              .from('services')
              .delete()
              .eq('service', group.service)
              .eq('main_category', group.mainCategory)
              .eq('location_id', selectedLocationId);
            if (error) { console.error('Error deleting service:', error); return; }
            await fetchServices();
          },
        },
      ]
    );
  };

  const handleAddRole = async (group: any, newRole: string, newPrice: string) => {
    const { error } = await supabase.from('services').insert([{
      main_category: group.mainCategory,
      service: group.service,
      role: newRole,
      price: Number(newPrice),
      duration: group.duration ?? 0,
      location_id: selectedLocationId,
    }]);
    if (error) { Alert.alert('Error', 'Could not add option.'); return; }
    await fetchServices();
    // Refresh the selectedService so the modal reflects the new row
    setSelectedService((prev: any) => prev ? {
      ...prev,
      roles: [...prev.roles, { role: newRole, price: Number(newPrice), id: null }],
    } : prev);
  };

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View className="items-center pt-6 pb-4 px-4">
          <Image
            source={images.logoTopOneWhite}
            style={{ width: 200, height: 80 }}
            resizeMode="contain"
          />
          <Text className="text-white font-psemibold text-xl mt-3">TopOne Salon</Text>
          <TouchableOpacity
            onPress={() => setLocationPickerVisible(true)}
            className="flex-row items-center mt-1"
          >
            <Text className="text-secondary font-psemibold text-sm mr-1">{selectedLocationName || 'Select Location'}</Text>
            <Image source={icons.rightArrow} style={{ width: 12, height: 12, transform: [{ rotate: '90deg' }] }} tintColor="#FFA001" resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Location Picker Modal */}
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
                onPress={() => setLocationPickerVisible(false)}
                style={{ padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#7B7B8B', fontFamily: 'Poppins-Regular', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Divider */}
        <View className="h-px bg-black-200 mx-4 mb-4" />

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#8ED1FC" />
          </View>
        ) : (
          <>
            {/* Category Selector */}
            <CategorySelector
              servicesData={servicesData}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Service List */}
            <ServiceList
              servicesData={servicesData}
              selectedCategory={selectedCategory}
              handleDetails={handleDetails}
              handleDeleteService={handleDeleteService}
            />
          </>
        )}

        {/* Add Service Button */}
        <TouchableOpacity
          onPress={() => setShowAddForm(true)}
          className="mx-4 mt-6 bg-secondary rounded-xl py-4 flex-row items-center justify-center"
        >
          <Image source={icons.plus} className="w-5 h-5 mr-2" tintColor="#161622" resizeMode="contain" />
          <Text className="text-primary font-psemibold text-base">Add New Service</Text>
        </TouchableOpacity>

        {/* Add Service Form */}
        {showAddForm && (
          <AddServiceForm
            mainCategory={mainCategory}
            setMainCategory={setMainCategory}
            existingCategories={Object.keys(servicesData)}
            service={service}
            price={price}
            role={role}
            duration={duration}
            setService={setService}
            setPrice={setPrice}
            setRole={setRole}
            setDuration={setDuration}
            handleAddService={handleAddService}
            setShowAddForm={setShowAddForm}
          />
        )}

        {/* Roles Modal */}
        <RolesModal
          selectedService={selectedService}
          showRolesModal={showRolesModal}
          setShowRolesModal={setShowRolesModal}
          handleDeleteRole={handleDeleteRole}
          handleEditRole={openEditRole}
          handleAddRole={handleAddRole}
        />

        {/* Edit Service Modal */}
        <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
              <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
              <Text className="text-white font-psemibold text-xl mb-4">Edit Service</Text>

              <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Service name</Text>
              <TextInput
                value={editService}
                onChangeText={setEditService}
                placeholder="Service name"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Duration (minutes)</Text>
              <TextInput
                value={editDuration}
                onChangeText={setEditDuration}
                placeholder="Duration (minutes)"
                placeholderTextColor="#7B7B8B"
                keyboardType="numeric"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Price (£)</Text>
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="Price"
                placeholderTextColor="#7B7B8B"
                keyboardType="numeric"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Role</Text>
              <TextInput
                value={editRole}
                onChangeText={setEditRole}
                placeholder="Role (e.g. Senior Stylist)"
                placeholderTextColor="#7B7B8B"
                className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-4"
              />

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={loading}
                className="bg-secondary rounded-xl py-4 items-center mb-3"
              >
                {loading ? (
                  <ActivityIndicator color="#161622" />
                ) : (
                  <Text className="text-primary font-psemibold text-base">Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditModal(false)} className="items-center py-2">
                <Text className="text-gray-100 font-pregular">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;
