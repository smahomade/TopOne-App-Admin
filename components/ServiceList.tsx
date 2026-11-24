import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ServiceList = ({ servicesData, selectedCategory, handleDetails, handleDeleteService }) => {
  const items = servicesData[selectedCategory] ?? [];

  if (items.length === 0) {
    return (
      <View className="px-4 py-10 items-center">
        <Text className="text-muted font-pregular text-sm">No services in this category yet.</Text>
      </View>
    );
  }

  return (
    <View className="px-4 mt-2">
      {items.map((group, index) => (
        <React.Fragment key={index}>
        {/* A heading starts each section (Ladies, Gents, Face…), as on the price list. */}
        {group.serviceCategory && items[index - 1]?.serviceCategory !== group.serviceCategory ? (
          <Text className={`text-ink font-psemibold text-xs uppercase tracking-widest mb-2 ${index > 0 ? 'mt-3' : ''}`}>
            {group.serviceCategory}
          </Text>
        ) : null}
        <View className="bg-card rounded-2xl p-4 mb-3">
          {/* The whole name, on as many lines as it needs: cut to one line,
              "Wash, cut & finish (longer/thicker)" lost the part that matters. */}
          <Text className="text-ink font-psemibold text-base">
            {group.service}
          </Text>

          <View className="flex-row items-center justify-between mt-2">
            <Text className="flex-1 text-muted font-pregular text-xs mr-2">
              {group.duration ? `${group.duration} mins · ` : ''}
              <Text className="text-ink font-psemibold">
                {group.roles.length} {group.roles.length === 1 ? 'option' : 'options'}
              </Text>
            </Text>

          {/* Actions */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => handleDetails(group)}
              className="bg-ink rounded-xl px-4 py-2"
            >
              <Text className="text-cream font-psemibold text-xs">Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteService(group)}
              className="bg-field rounded-xl px-3 py-2"
            >
              <Text className="text-danger font-psemibold text-xs">Delete</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
        </React.Fragment>
      ))}
    </View>
  );
};

export default ServiceList;
