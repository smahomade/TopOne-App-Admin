import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';

const inputField = (value: string, setter: (v: string) => void, placeholder: string, numeric = false) => (
  <TextInput
    value={value}
    onChangeText={setter}
    placeholder={placeholder}
    placeholderTextColor="#7B7B8B"
    keyboardType={numeric ? 'numeric' : 'default'}
    className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
  />
);

const AddServiceForm = ({
  mainCategory,
  setMainCategory,
  existingCategories,
  service,
  price,
  role,
  duration,
  setService,
  setPrice,
  setRole,
  setDuration,
  handleAddService,
  setShowAddForm,
}: {
  mainCategory: string;
  setMainCategory: (v: string) => void;
  existingCategories: string[];
  service: string;
  price: string;
  role: string;
  duration: string;
  setService: (v: string) => void;
  setPrice: (v: string) => void;
  setRole: (v: string) => void;
  setDuration: (v: string) => void;
  handleAddService: () => void;
  setShowAddForm: (v: boolean) => void;
}) => {
  return (
    <View className="mx-4 mt-4 bg-black-100 rounded-2xl p-5">
      <Text className="text-white font-psemibold text-lg mb-1">Add New Service</Text>

      {/* Main Category Selector */}
      <Text className="text-gray-100 font-pregular text-xs mb-2">Main Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {existingCategories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setMainCategory(cat)}
            className={`mr-2 px-4 py-2 rounded-full border ${
              mainCategory === cat ? 'bg-secondary border-secondary' : 'bg-black-200 border-black-200'
            }`}
          >
            <Text className={`font-psemibold text-sm ${
              mainCategory === cat ? 'text-primary' : 'text-gray-100'
            }`}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* New Category Input */}
      <TextInput
        value={existingCategories.includes(mainCategory) ? '' : mainCategory}
        onChangeText={(v) => setMainCategory(v)}
        placeholder="Or type a new category..."
        placeholderTextColor="#7B7B8B"
        className="bg-black-200 text-white font-pregular rounded-xl px-4 py-3 mb-3"
      />

      {inputField(service, setService, 'Service name')}
      {inputField(duration, setDuration, 'Duration (minutes)', true)}
      {inputField(price, setPrice, 'Price (£)', true)}
      {inputField(role, setRole, 'Role (e.g. Senior Stylist)')}

      <TouchableOpacity
        onPress={handleAddService}
        className="bg-secondary rounded-xl py-4 items-center mt-1"
      >
        <Text className="text-primary font-psemibold text-base">Submit Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowAddForm(false)}
        className="items-center py-3 mt-1"
      >
        <Text className="text-gray-100 font-pregular">Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddServiceForm;
