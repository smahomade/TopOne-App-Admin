import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import CategorySelector from '../../components/CategorySelector';
import ServiceList from '../../components/ServiceList';
import AddServiceForm from '../../components/AddServiceForm';
import RolesModal from '../../components/RolesModal';
import { images, icons } from '../../constants';

const Services = () => {
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

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, main_category, service_category, service, role, price');

      if (error) { console.error(error); return; }

      const organizedData = data.reduce((acc: Record<string, any[]>, item: any) => {
        const { main_category, service_category, service: serviceName, role, price, id } = item;
        if (!acc[main_category]) acc[main_category] = [];
        const existingGroup = acc[main_category].find(
          (g: any) => g.service === serviceName && g.service_category === service_category
        );
        if (existingGroup) {
          existingGroup.roles.push({ role, price, id });
        } else {
          acc[main_category].push({ service: serviceName, service_category, roles: [{ role, price, id }] });
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
    if (!serviceCategory || !service || !price || !role || !duration) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('services').insert([{
        main_category: mainCategory,
        service_category: serviceCategory,
        service,
        price: Number(price),
        role,
        duration: Number(duration),
      }]);
      if (error) { Alert.alert('Error', 'Could not add service.'); return; }
      Alert.alert('Success', 'Service added.');
      setServiceCategory(''); setService(''); setPrice(''); setRole(''); setDuration('');
      setShowAddForm(false);
      await fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase.from('services').delete().eq('id', roleId);
    if (error) { console.error('Error deleting role:', error); return; }
    await fetchServices();
  };

  const handleDeleteCategory = async (category: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category}" and all its services?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('services').delete().eq('service_category', category);
            if (error) { console.error('Error deleting category:', error); return; }
            await fetchServices();
          },
        },
      ]
    );
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
          <Text className="text-gray-100 font-pregular text-sm">Richmond</Text>
        </View>

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
              handleDeleteCategory={handleDeleteCategory}
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
            service={service}
            price={price}
            role={role}
            duration={duration}
            setServiceCategory={setServiceCategory}
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
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;
