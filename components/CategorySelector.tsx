import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';

const CategorySelector = ({ servicesData, selectedCategory, setSelectedCategory }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      className="mb-2"
    >
      {Object.keys(servicesData).map((category) => {
        const active = selectedCategory === category;
        return (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategory(category)}
            className={`mr-3 px-5 py-2 rounded-full border ${
              active ? 'bg-secondary border-secondary' : 'bg-black-100 border-black-200'
            }`}
          >
            <Text
              className={`font-psemibold text-sm ${
                active ? 'text-primary' : 'text-gray-100'
              }`}
            >
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default CategorySelector;
