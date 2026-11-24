import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';

type RoleItem = { id: string | null; role: string; price: number | null; };
type ServiceGroup = { service: string; mainCategory: string; serviceCategory?: string | null; duration?: number; sortOrder?: number | null; roles: RoleItem[]; };

const RolesModal = ({
  selectedService,
  showRolesModal,
  setShowRolesModal,
  handleDeleteRole,
  handleEditRole,
  handleAddRole,
  children,
}: {
  // Shown inside this sheet's Modal, e.g. its "Delete this price?" pop-up.
  children?: React.ReactNode;
  selectedService: ServiceGroup | null;
  showRolesModal: boolean;
  setShowRolesModal: (v: boolean) => void;
  handleDeleteRole: (id: string) => void;
  handleEditRole: (roleItem: RoleItem, group: ServiceGroup) => void;
  handleAddRole: (group: ServiceGroup, role: string, price: string) => void;
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const submitAdd = async () => {
    // An empty price is fine: customers see "Price on consultation".
    if (!newRole.trim()) return;
    if (!selectedService) return;
    await handleAddRole(selectedService, newRole.trim(), newPrice);
    setNewRole('');
    setNewPrice('');
    setShowAddForm(false);
  };
  return (
    <Modal
      visible={showRolesModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRolesModal(false)}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="bg-card rounded-t-2xl px-5 pt-5 pb-8">
          {/* Handle bar */}
          <View className="w-10 h-1 bg-field rounded-full self-center mb-5" />

          <Text className="text-ink font-psemibold text-xl mb-1">
            {selectedService?.service}
          </Text>
          {selectedService?.serviceCategory ? (
            <Text className="text-ink font-pregular text-xs mb-1">{selectedService.serviceCategory}</Text>
          ) : null}
          {selectedService?.duration ? (
            <Text className="text-muted font-pregular text-xs mb-5">
              {selectedService.duration} mins
            </Text>
          ) : <View className="mb-5" />}

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {selectedService?.roles.map((roleItem, index) => (
              <View
                key={index}
                className="bg-field rounded-xl px-4 py-3 mb-3 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-ink font-psemibold text-sm">{roleItem.role}</Text>
                  <Text className="text-ink font-pregular text-sm mt-0.5">
                    {roleItem.price == null ? 'Price on consultation' : `£${roleItem.price}`}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditRole(roleItem, selectedService)}
                    className="bg-ink rounded-lg px-3 py-2"
                  >
                    <Text className="text-cream font-psemibold text-xs">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => roleItem.id && handleDeleteRole(roleItem.id)}
                    className="bg-card rounded-lg px-3 py-2"
                  >
                    <Text className="text-danger font-psemibold text-xs">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => { setShowAddForm(!showAddForm); setNewRole(''); setNewPrice(''); }}
            className="bg-field rounded-xl py-3 items-center mt-2 mb-2 flex-row justify-center"
          >
            <Text className="text-ink font-psemibold text-sm">{showAddForm ? 'Cancel' : '+ Add Option'}</Text>
          </TouchableOpacity>

          {showAddForm && (
            <View className="bg-field rounded-xl p-4 mb-2">
              <TextInput
                value={newRole}
                onChangeText={setNewRole}
                placeholder="Role (e.g. Senior Stylist)"
                placeholderTextColor="#8A8178"
                className="bg-card text-ink font-pregular rounded-xl px-4 py-3 mb-2"
              />
              <TextInput
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="Price (£), or empty for consultation"
                placeholderTextColor="#8A8178"
                keyboardType="numeric"
                className="bg-card text-ink font-pregular rounded-xl px-4 py-3 mb-3"
              />
              <TouchableOpacity
                onPress={submitAdd}
                className="bg-ink rounded-xl py-3 items-center"
              >
                <Text className="text-cream font-psemibold text-sm">Add</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => { setShowAddForm(false); setShowRolesModal(false); }}
            className="bg-field rounded-xl py-4 items-center mt-2"
          >
            <Text className="text-ink font-psemibold text-base">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      {children}
    </Modal>
  );
};

export default RolesModal;
