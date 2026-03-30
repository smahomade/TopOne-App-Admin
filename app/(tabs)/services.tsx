import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView, Image, Text, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';  // Adjust the path as necessary
import CategorySelector from '../../components/CategorySelector';
import ServiceList from '../../components/ServiceList';
import AddServiceForm from '../../components/AddServiceForm';
import RolesModal from '../../components/RolesModal';
import { images } from "../../constants"; 

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Cuts');
  const [servicesData, setServicesData] = useState({});
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

      if (error) {
        console.error(error);
        return;
      }

      const organizedData = data.reduce((acc, service) => {
        const { main_category, service_category, service: serviceName, role, price, id } = service;
        if (!acc[main_category]) acc[main_category] = [];
        let existingGroup = acc[main_category].find(
          group => group.service === serviceName && group.service_category === service_category
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

  const handleDetails = (group) => {
    setSelectedService(group);
    setShowRolesModal(true);
  };

  const handleAddService = async () => {
    if (!serviceCategory || !service || !price || !role || !duration) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('services')
        .insert([
          {
            main_category: mainCategory,
            service_category: serviceCategory,
            service: service,
            price: Number(price),
            role: role,
            duration: Number(duration)
          }
        ]);

      if (error) {
        console.error(error);
        alert('Error adding service');
      } else {
        alert('Service added successfully');
        setServiceCategory('');
        setService('');
        setPrice('');
        setRole('');
        setDuration('');
        setShowAddForm(false); // Hide the form after adding
        await fetchServices(); // Refresh the list after adding the service
      }
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', roleId);

      if (error) {
        console.error('Error deleting role:', error);
      } else {
        alert('Role deleted successfully');
        await fetchServices(); // Refresh the services list
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleDeleteCategory = async (category) => {
  Alert.alert(
    'Delete Category',
    `Are you sure you want to delete the category "${category}" and all its services?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            // Delete all services where service_category matches the selected category
            const { error } = await supabase
              .from('services')
              .delete()
              .eq('service_category', category); // This will remove all services in the category

            if (error) {
              console.error('Error deleting category:', error);
            } else {
              alert(`Category "${category}" deleted successfully`);
              await fetchServices(); // Refresh the services list after deletion
            }
          } catch (error) {
            console.error('Error deleting category:', error);
          }
        }
      }
    ]
  );
};


  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView>
        {/* Logo Section */}
        <View className="items-center mt-14 mb-8">
          <Image 
            source={images.logoTopOneSmall} 
            className="w-40 h-16"
            resizeMode="contain"
          />
          <Text className="text-lg mt-6">TopOne Salon - Richmond</Text>
        </View>

        {/* Category Selector */}
        <CategorySelector
          servicesData={servicesData}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {/* Grouped Services Section */}
        <ServiceList
          servicesData={servicesData}
          selectedCategory={selectedCategory}
          handleDetails={handleDetails} // Updated from "handleBook"
          handleDeleteCategory={handleDeleteCategory} // Passing delete function for category
        />

        {/* Add New Service Button */}
        <TouchableOpacity onPress={() => setShowAddForm(true)}>
          <View className="p-4 bg-blue-500 rounded">
            <Text className="text-center text-white">Add New Service</Text>
          </View>
        </TouchableOpacity>

        {/* Add Service Form */}
        {showAddForm && (
          <AddServiceForm
            mainCategory={mainCategory}
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
          handleDeleteRole={handleDeleteRole} // Pass role delete function
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;
