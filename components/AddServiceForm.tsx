import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';

const inputField = (value: string, setter: (v: string) => void, placeholder: string, numeric = false) => (
  <TextInput
    value={value}
    onChangeText={setter}
    placeholder={placeholder}
    placeholderTextColor="#8A8178"
    keyboardType={numeric ? 'numeric' : 'default'}
    className="bg-field text-ink font-pregular rounded-xl px-4 py-3 mb-3"
  />
);

const AddServiceForm = ({
  mainCategory,
  setMainCategory,
  existingCategories,
  serviceCategory,
  setServiceCategory,
  existingSections,
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
  serviceCategory: string;
  setServiceCategory: (v: string) => void;
  existingSections: string[];
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
    <View className="mx-4 mt-4 bg-card rounded-2xl p-5">
      <Text className="text-ink font-psemibold text-lg mb-1">Add New Service</Text>

      {/* Main Category Selector */}
      <Text className="text-muted font-pregular text-xs mb-2">Main Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {existingCategories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setMainCategory(cat)}
            className={`mr-2 px-4 py-2 rounded-full border ${
              mainCategory === cat ? 'bg-ink border-ink' : 'bg-field border-line'
            }`}
          >
            <Text className={`font-psemibold text-sm ${
              mainCategory === cat ? 'text-cream' : 'text-muted'
            }`}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* New Category Input */}
      <TextInput
        value={existingCategories.includes(mainCategory) ? '' : mainCategory}
        onChangeText={(v) => setMainCategory(v)}
        placeholder="Or type a new category..."
        placeholderTextColor="#8A8178"
        className="bg-field text-ink font-pregular rounded-xl px-4 py-3 mb-3"
      />

      {/* Sections group a category's services under headings, like
          Ladies / Gents under Hair, or Face / Arms under Laser. */}
      <Text className="text-muted font-pregular text-xs mb-2">Section (optional)</Text>
      {existingSections.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          {existingSections.map((section) => (
            <TouchableOpacity
              key={section}
              onPress={() => setServiceCategory(serviceCategory === section ? '' : section)}
              className={`mr-2 px-4 py-2 rounded-full border ${
                serviceCategory === section ? 'bg-ink border-ink' : 'bg-field border-line'
              }`}
            >
              <Text className={`font-psemibold text-sm ${
                serviceCategory === section ? 'text-cream' : 'text-muted'
              }`}>{section}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <TextInput
        value={existingSections.includes(serviceCategory) ? '' : serviceCategory}
        onChangeText={setServiceCategory}
        placeholder={existingSections.length > 0 ? 'Or type a new section...' : 'Section, e.g. Ladies'}
        placeholderTextColor="#8A8178"
        className="bg-field text-ink font-pregular rounded-xl px-4 py-3 mb-3"
      />

      {inputField(service, setService, 'Service name')}
      {inputField(duration, setDuration, 'Duration in minutes (optional)', true)}
      {inputField(price, setPrice, 'Price (£), or empty for "Price on consultation"', true)}
      {inputField(role, setRole, 'Role (e.g. Senior Stylist)')}

      <TouchableOpacity
        onPress={handleAddService}
        className="bg-ink rounded-xl py-4 items-center mt-1"
      >
        <Text className="text-cream font-psemibold text-base">Submit Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowAddForm(false)}
        className="items-center py-3 mt-1"
      >
        <Text className="text-muted font-pregular">Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddServiceForm;
