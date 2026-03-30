import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

const CategorySelector = ({ servicesData, selectedCategory, setSelectedCategory }) => {
  return (
    <View className="flex-row justify-around mb-6">
      {Object.keys(servicesData).map((category) => (
        <TouchableOpacity key={category} onPress={() => setSelectedCategory(category)}>
          <Text className={`text-lg ${selectedCategory === category ? 'text-blue-500' : 'text-black'}`}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default CategorySelector;
