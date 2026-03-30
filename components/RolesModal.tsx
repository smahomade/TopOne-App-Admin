import React from 'react';
import { View, Text, Modal, Button, TouchableOpacity } from 'react-native';

const RolesModal = ({ selectedService, showRolesModal, setShowRolesModal, handleDeleteRole }) => {
  return (
    <Modal
      visible={showRolesModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRolesModal(false)}
    >
      <View className="flex-1 justify-center items-center bg-gray-700 bg-opacity-50">
        <View className="bg-white p-6 rounded-lg w-4/5">
          <Text className="text-lg font-bold mb-4">Details for {selectedService?.service}</Text>
          <Text className="text-sm text-gray-600 mb-4">Category: {selectedService?.service_category}</Text>

          {/* List of roles with delete option */}
          {selectedService?.roles.map((roleItem, index) => (
            <View key={index} className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-base">{roleItem.role}</Text>
                <Text className="text-gray-500">{`£${roleItem.price}`}</Text>
              </View>

              {/* Delete button for each role */}
              <TouchableOpacity onPress={() => handleDeleteRole(roleItem.id)}>
                <View className="p-2 bg-red-500 rounded">
                  <Text className="text-white">Delete</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}

          {/* Close Modal Button */}
          <Button title="Close" onPress={() => setShowRolesModal(false)} />
        </View>
      </View>
    </Modal>
  );
};

export default RolesModal;
