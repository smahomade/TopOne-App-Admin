import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

const AddServiceForm = ({
  mainCategory,
  serviceCategory,
  service,
  price,
  role,
  duration,
  setServiceCategory,
  setService,
  setPrice,
  setRole,
  setDuration,
  handleAddService,
  setShowAddForm,
}) => {
  return (
    <View className="p-4 my-4 bg-gray-100">
      <Text className="text-lg font-bold mb-4">Add New Service</Text>

      <Text className="text-base mb-2">Main Category: {mainCategory}</Text>

      <TextInput
        value={serviceCategory}
        onChangeText={setServiceCategory}
        placeholder="Enter service category"
        className="border p-2 mb-4"
      />

      <TextInput
        value={service}
        onChangeText={setService}
        placeholder="Enter service"
        className="border p-2 mb-4"
      />

      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Enter price"
        keyboardType="numeric"
        className="border p-2 mb-4"
      />

      <TextInput
        value={role}
        onChangeText={setRole}
        placeholder="Enter role"
        className="border p-2 mb-4"
      />

      <TextInput
        value={duration}
        onChangeText={setDuration}
        placeholder="Enter duration (minutes)"
        keyboardType="numeric"
        className="border p-2 mb-4"
      />

      <TouchableOpacity onPress={handleAddService}>
        <View className="p-4 bg-green-500 rounded">
          <Text className="text-center text-white">Submit Service</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowAddForm(false)}>
        <View className="p-4 bg-red-500 rounded mt-4">
          <Text className="text-center text-white">Cancel</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default AddServiceForm;
