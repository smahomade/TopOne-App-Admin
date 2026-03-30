import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ServiceList = ({ servicesData, selectedCategory, handleDetails, handleDeleteCategory }) => {
  return (
    <View>
      {servicesData[selectedCategory]?.map((group, index) => (
        <View key={index} className="flex-row justify-between items-center px-4 my-2 mb-8">
          
          {/* Delete Category Button on the left */}
          <TouchableOpacity onPress={() => handleDeleteCategory(group.service_category)}>
            <View className="p-2 bg-red-500 rounded">
              <Text className="text-white">X</Text>
            </View>
          </TouchableOpacity>

          {/* Service Information */}
          <View className="flex-1 px-4">
            <Text className="text-base font-bold">{group.service_category}</Text>
            <Text className="text-base">{group.service}</Text>
          </View>

          {/* Details button on the right */}
          <TouchableOpacity onPress={() => handleDetails(group)}>
            <View className="p-2 bg-blue-500 rounded">
              <Text className="text-white">Details</Text>
            </View>
          </TouchableOpacity>

        </View>
      ))}
    </View>
  );
};

export default ServiceList;
