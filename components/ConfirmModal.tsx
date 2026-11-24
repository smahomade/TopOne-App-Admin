import React from 'react';
import { ActivityIndicator, Image, Modal, Text, TouchableOpacity, View } from 'react-native';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  // A picture of what's being removed, so staff can check it's the right one.
  imageUrl?: string | null;
  confirmText?: string;
  cancelText?: string;
  // Shown on the red button while the action runs.
  loadingText?: string;
  isLoading?: boolean;
  // Shown inside the pop-up when the action failed, so it can be tried again.
  errorText?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// The app's own dark pop-up for "are you sure?" steps, in place of the plain
// system alert. Same look as the customer app's ConfirmModal.
const ConfirmModal = ({
  visible,
  title,
  message,
  imageUrl,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loadingText = 'Working ...',
  isLoading = false,
  errorText,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={() => {
      if (!isLoading) onCancel();
    }}
  >
    <View
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      className="flex-1 items-center justify-center px-6"
    >
      <View className="w-full rounded-2xl bg-card p-6">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 96, height: 128, borderRadius: 12, alignSelf: 'center', marginBottom: 16 }}
            resizeMode="cover"
          />
        ) : null}

        <Text className="text-center text-xl text-ink font-psemibold">{title}</Text>
        <Text className="mt-3 text-center text-base text-muted font-pregular">{message}</Text>

        {errorText ? (
          <Text className="mt-3 text-center text-sm font-pregular" style={{ color: '#B3261E' }}>
            {errorText}
          </Text>
        ) : null}

        {/* Cancel is the prominent option so the destructive one is never the reflex tap. */}
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          disabled={isLoading}
          className={`mt-6 min-h-[62px] w-full items-center justify-center rounded-xl bg-ink ${
            isLoading ? 'opacity-50' : ''
          }`}
        >
          <Text className="text-cream font-psemibold text-lg">{cancelText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onConfirm}
          activeOpacity={0.7}
          disabled={isLoading}
          className="mt-3 min-h-[62px] w-full flex-row items-center justify-center rounded-xl border"
          style={{ borderColor: '#E8B4AE' }}
        >
          {isLoading ? <ActivityIndicator color="#B3261E" style={{ marginRight: 8 }} /> : null}
          <Text className="font-psemibold text-lg" style={{ color: '#B3261E' }}>
            {isLoading ? loadingText : confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default ConfirmModal;
