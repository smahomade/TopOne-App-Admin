import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'

import { icons, images } from '../constants'

const FormField = ({title, value, placeholder, handleChangeText, editable = true, textColor = '#1A1817', OtherStyles, secret = false, ...props}) => {
  return (
    <View className={`space-y-2 ${OtherStyles}`}>
      <Text className={`text-base font-pmedium ${editable ? (props.titleColor || 'text-muted') : 'text-faint'}`}>{title}</Text>

      {editable ? (
        <View className="border-2 border-line w-full h-14 px-4 bg-card rounded-2xl focus:border-ink items-center flex-row">
          <TextInput
            className="flex-1 font-psemibold text-base"
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#8A8178"
            onChangeText={handleChangeText}
            secureTextEntry={props.secureTextEntry || false}
            autoCapitalize="none"
            style={{ color: textColor }}  // Apply text color
          />
        </View>
      ) : (
        <View className="border-2 border-line w-full h-14 px-4 rounded-2xl flex-row items-center" style={{ backgroundColor: '#EDE8E1' }}>
          <Text style={{ color: '#8A8178', flex: 1, letterSpacing: secret ? 4 : 0 }} className="font-psemibold text-base">
            {secret ? '••••••' : (value || placeholder)}
          </Text>
        </View>
      )}
    </View>
  );
};



export default FormField