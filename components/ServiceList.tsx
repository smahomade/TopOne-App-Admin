import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ServiceList = ({ servicesData, selectedCategory, handleDetails, handleDeleteService }) => {
  const items = servicesData[selectedCategory] ?? [];

  if (items.length === 0) {
    return (
      <View className="px-4 py-10 items-center">
        <Text className="text-gray-100 font-pregular text-sm">No services in this category yet.</Text>
      </View>
    );
  }

  return (
    <View className="px-4 mt-2">
      {items.map((group, index) => (
        <View
          key={index}
          className="bg-black-100 rounded-2xl p-4 mb-3 flex-row justify-between items-center"
        >
          {/* Service info */}
          <View className="flex-1">
            <Text className="text-white font-psemibold text-base" numberOfLines={1}>
              {group.service}
            </Text>
            {group.duration ? (
              <Text className="text-gray-100 font-pregular text-xs mt-0.5">
                {group.duration} mins
              </Text>
            ) : null}
            <Text className="text-secondary font-psemibold text-xs mt-1">
              {group.roles.length} {group.roles.length === 1 ? 'option' : 'options'}
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => handleDetails(group)}
              className="bg-secondary rounded-xl px-4 py-2"
            >
              <Text className="text-primary font-psemibold text-xs">Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteService(group)}
              className="bg-black-200 rounded-xl px-3 py-2"
            >
              <Text className="text-red-400 font-psemibold text-xs">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

export default ServiceList;
