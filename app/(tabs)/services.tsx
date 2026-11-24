import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Text, Alert, ActivityIndicator, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import CategorySelector from '../../components/CategorySelector';
import ServiceList from '../../components/ServiceList';
import AddServiceForm from '../../components/AddServiceForm';
import RolesModal from '../../components/RolesModal';
import ConfirmModal from '../../components/ConfirmModal';
import { images, icons } from '../../constants';
import { useLocation } from '../../context/LocationContext';

// An empty price is saved as no price, which customers see as
// "Price on consultation", as on the salon's website.
const parsePrice = (value: string) => (value.trim() === '' ? null : Number(value));
import SalonLogo from '../../components/SalonLogo';

const Services = () => {
  const { selectedLocationId, selectedLocationName, locations, setSelectedLocation } = useLocation();
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('Cuts');
  const [servicesData, setServicesData] = useState<Record<string, any[]>>({});
  const [selectedService, setSelectedService] = useState(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mainCategory, setMainCategory] = useState('Cuts');
  const [serviceCategory, setServiceCategory] = useState('');
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
  const [editServiceCategory, setEditServiceCategory] = useState('');
  // The group being edited, so renames and duration changes apply to every
  // option in it instead of splitting it in two.
  const [editOriginal, setEditOriginal] = useState<{ service: string; mainCategory: string; serviceCategory: string | null } | null>(null);

  // The "Delete this price?" / "Delete this service?" pop-ups
  const [pendingRoleDelete, setPendingRoleDelete] = useState<{ id: string; role: string; price: number | null } | null>(null);
  const [pendingServiceDelete, setPendingServiceDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedLocationId) {
      fetchServices();
      setServicesData({});
    }
  }, [selectedLocationId]);

  // Each location has its own categories, so fall back to its first one.
  useEffect(() => {
    const categories = Object.keys(servicesData);
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
      setMainCategory(categories[0]);
    }
  }, [servicesData]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Hidden rows (is_active false) are left out, as in the customer app.
      // sort_order keeps the website's price-list order; new services go last.
      const { data, error } = await supabase
        .from('services')
        .select('id, main_category, service_category, service, role, price, duration, sort_order')
        .eq('location_id', selectedLocationId)
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (error) { console.error(error); return; }

      const organizedData = data.reduce((acc: Record<string, any[]>, item: any) => {
        const { main_category, service_category, service: serviceName, role, price, duration, id, sort_order } = item;
        if (!acc[main_category]) acc[main_category] = [];
        // The same name can be in two sections (Ladies and Girls both have
        // "Wash, cut & finish"), so a service is its section plus its name.
        const existingGroup = acc[main_category].find(
          (g: any) => g.service === serviceName && g.serviceCategory === (service_category ?? null)
        );
        if (existingGroup) {
          existingGroup.roles.push({ role, price, id });
          if (sort_order != null) existingGroup.sortOrder = Math.max(existingGroup.sortOrder ?? sort_order, sort_order);
        } else {
          acc[main_category].push({
            service: serviceName,
            mainCategory: main_category,
            serviceCategory: service_category ?? null,
            duration,
            sortOrder: sort_order ?? null,
            roles: [{ role, price, id }],
          });
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
    if (!mainCategory.trim() || !service.trim() || !role.trim()) {
      Alert.alert('Missing fields', 'Please fill in the category, service name and role.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('services').insert([{
        main_category: mainCategory.trim(),
        service_category: serviceCategory.trim() || null,
        service: service.trim(),
        price: parsePrice(price),
        role: role.trim(),
        duration: duration.trim() ? Number(duration) : null,
        location_id: selectedLocationId,
      }]);
      if (error) { Alert.alert('Error', 'Could not add service.'); return; }
      Alert.alert('Success', 'Service added.');
      setService(''); setPrice(''); setRole(''); setDuration(''); setServiceCategory('');
      setShowAddForm(false);
      await fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditRole = (roleItem: any, group: any) => {
    setEditingId(roleItem.id);
    setEditService(group.service);
    setEditPrice(roleItem.price == null ? '' : String(roleItem.price));
    setEditRole(roleItem.role);
    setEditDuration(String(group.duration ?? ''));
    setEditMainCategory(group.mainCategory);
    setEditServiceCategory(group.serviceCategory ?? '');
    setEditOriginal({ service: group.service, mainCategory: group.mainCategory, serviceCategory: group.serviceCategory ?? null });
    // The options sheet stays open underneath; Cancel goes back to it.
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editService.trim() || !editRole.trim()) {
      Alert.alert('Missing fields', 'Please fill in the service name and role.');
      return;
    }
    try {
      setLoading(true);
      // This option's own fields
      const { error } = await supabase.from('services').update({
        price: parsePrice(editPrice),
        role: editRole.trim(),
      }).eq('id', editingId);
      if (error) { Alert.alert('Error', 'Could not save changes.'); return; }
      // Name, section and duration are shared by every option of the service
      const groupQuery = supabase.from('services').update({
        service: editService.trim(),
        main_category: editMainCategory,
        service_category: editServiceCategory.trim() || null,
        duration: editDuration.trim() ? Number(editDuration) : null,
      })
        .eq('service', editOriginal?.service ?? editService.trim())
        .eq('main_category', editOriginal?.mainCategory ?? editMainCategory)
        .eq('location_id', selectedLocationId);
      const { error: groupError } = editOriginal?.serviceCategory
        ? await groupQuery.eq('service_category', editOriginal.serviceCategory)
        : await groupQuery.is('service_category', null);
      if (groupError) { Alert.alert('Error', 'Could not save the service name, section or duration.'); return; }
      // Both sheets close: the options sheet would show the old values.
      setEditModal(false);
      setShowRolesModal(false);
      await fetchServices();
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setLoading(false);
    }
  };

  // Opens the "Delete this price?" pop-up; the delete runs from its red button.
  const handleDeleteRole = (roleId: string) => {
    const roleItem = (selectedService as any)?.roles.find((r: any) => r.id === roleId);
    if (!roleItem) return;
    setDeleteError(null);
    setPendingRoleDelete(roleItem);
  };

  const confirmDeleteRole = async () => {
    if (!pendingRoleDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.from('services').delete().eq('id', pendingRoleDelete.id);
      if (error) { setDeleteError('Could not delete this price. Try again.'); return; }
      const remainingRoles = ((selectedService as any)?.roles ?? []).filter((r: any) => r.id !== pendingRoleDelete.id);
      setPendingRoleDelete(null);
      // With its last price gone the service is gone too, so close its sheet.
      if (remainingRoles.length === 0) setShowRolesModal(false);
      setSelectedService((prev: any) => prev ? { ...prev, roles: remainingRoles } : prev);
      await fetchServices();
    } finally {
      setDeleting(false);
    }
  };

  // Opens the "Delete this service?" pop-up; the delete runs from its red button.
  const handleDeleteService = (group: any) => {
    setDeleteError(null);
    setPendingServiceDelete(group);
  };

  const confirmDeleteService = async () => {
    const group = pendingServiceDelete;
    if (!group) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const deleteQuery = supabase
        .from('services')
        .delete()
        .eq('service', group.service)
        .eq('main_category', group.mainCategory)
        .eq('location_id', selectedLocationId);
      // Only this section's copy: Ladies and Girls can share a name.
      const { error } = group.serviceCategory
        ? await deleteQuery.eq('service_category', group.serviceCategory)
        : await deleteQuery.is('service_category', null);
      if (error) { setDeleteError('Could not delete this service. Try again.'); return; }
      setPendingServiceDelete(null);
      await fetchServices();
    } finally {
      setDeleting(false);
    }
  };

  const formatRolePrice = (price: number | null) => (price == null ? 'Price on consultation' : `£${price}`);

  const handleAddRole = async (group: any, newRole: string, newPrice: string) => {
    const { data: inserted, error } = await supabase.from('services').insert([{
      main_category: group.mainCategory,
      service_category: group.serviceCategory ?? null,
      service: group.service,
      role: newRole,
      price: parsePrice(newPrice),
      duration: group.duration ?? null,
      // Right after the service's other options in the list.
      sort_order: group.sortOrder != null ? group.sortOrder + 1 : null,
      location_id: selectedLocationId,
    }]).select('id').single();
    if (error) { Alert.alert('Error', 'Could not add option.'); return; }
    await fetchServices();
    // Refresh the selectedService so the modal reflects the new row. It needs
    // the real id, or the new option can't be edited or deleted until reopened.
    setSelectedService((prev: any) => prev ? {
      ...prev,
      roles: [...prev.roles, { role: newRole, price: parsePrice(newPrice), id: inserted.id }],
    } : prev);
  };

  // The edit sheet opens on top of the options sheet, inside its Modal: an
  // iPhone drops a pop-up that opens while another is still closing.
  const editServiceModal = (
    <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
      {/* Scrolls and moves up for the keyboard, so every field can be reached. */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      >
        <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
          <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />
          <Text className="text-white font-psemibold text-xl mb-4">Edit Service</Text>

          <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Section (e.g. Ladies, Gents, Face)</Text>
          <TextInput
            value={editServiceCategory}
            onChangeText={setEditServiceCategory}
            placeholder="Section (optional)"
            placeholderTextColor="#7B7B8B"
            className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
          />
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
          <Text className="text-gray-100 font-pregular text-xs mb-1 ml-1">Price (£) · empty shows "Price on consultation"</Text>
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
      </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        {/* Kept compact so the services start in the top half of a small phone. */}
        <View className="items-center pt-4 pb-3 px-4">
          <SalonLogo
            style={{ width: 150, height: 60 }}
            resizeMode="contain"
          />
          <Text className="text-white font-psemibold text-xl mt-2">TopOne Salon</Text>
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
            serviceCategory={serviceCategory}
            setServiceCategory={setServiceCategory}
            existingSections={[...new Set((servicesData[mainCategory] ?? []).map((g: any) => g.serviceCategory).filter(Boolean))] as string[]}
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
        >
          {/* Inside the sheet's own Modal, so it shows on top of the sheet. */}
          <ConfirmModal
            visible={!!pendingRoleDelete}
            title="Delete this price?"
            message={
              (selectedService as any)?.roles.length === 1
                ? `It's the only price for "${(selectedService as any)?.service}", so the service will be removed from the menu too.`
                : `"${pendingRoleDelete?.role} · ${formatRolePrice(pendingRoleDelete?.price ?? null)}" will be removed from "${(selectedService as any)?.service}". Customers won't see it any more.`
            }
            confirmText="Delete price"
            cancelText="Keep it"
            loadingText="Deleting ..."
            isLoading={deleting}
            errorText={deleteError}
            onConfirm={() => void confirmDeleteRole()}
            onCancel={() => setPendingRoleDelete(null)}
          />
          {editServiceModal}
        </RolesModal>

        <ConfirmModal
          visible={!!pendingServiceDelete}
          title="Delete this service?"
          message={
            pendingServiceDelete
              ? `"${pendingServiceDelete.service}"${pendingServiceDelete.serviceCategory ? ` (${pendingServiceDelete.serviceCategory})` : ''} and its ${pendingServiceDelete.roles.length} ${pendingServiceDelete.roles.length === 1 ? 'price' : 'prices'} will be removed. Customers won't see it any more.`
              : ''
          }
          confirmText="Delete service"
          cancelText="Keep it"
          loadingText="Deleting ..."
          isLoading={deleting}
          errorText={deleteError}
          onConfirm={() => void confirmDeleteService()}
          onCancel={() => setPendingServiceDelete(null)}
        />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;
