import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';

const RolesModal = ({ selectedService, showRolesModal, setShowRolesModal, handleDeleteRole }) => {
  return (
    <Modal
      visible={showRolesModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRolesModal(false)}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="bg-black-100 rounded-t-2xl px-5 pt-5 pb-8">
          {/* Handle bar */}
          <View className="w-10 h-1 bg-black-200 rounded-full self-center mb-5" />

          <Text className="text-white font-psemibold text-xl mb-1">
            {selectedService?.service}
          </Text>
          <Text className="text-gray-100 font-pregular text-xs mb-5">
            {selectedService?.service_category}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {selectedService?.roles.map((roleItem, index) => (
              <View
                key={index}
                className="bg-black-200 rounded-xl px-4 py-3 mb-3 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-white font-psemibold text-sm">{roleItem.role}</Text>
                  <Text className="text-secondary font-pregular text-sm mt-0.5">£{roleItem.price}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteRole(roleItem.id)}
                  className="bg-black-100 rounded-lg px-3 py-2"
                >
                  <Text className="text-red-400 font-psemibold text-xs">Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setShowRolesModal(false)}
            className="bg-black-200 rounded-xl py-4 items-center mt-2"
          >
            <Text className="text-white font-psemibold text-base">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default RolesModal;
