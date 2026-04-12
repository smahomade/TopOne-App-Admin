import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'

import { icons, images } from '../constants'

const FormField = ({title, value, placeholder, handleChangeText, editable = true, textColor = 'white', OtherStyles, secret = false, ...props}) => {
  return (
    <View className={`space-y-2 ${OtherStyles}`}>
      <Text className={`text-base font-pmedium ${editable ? (props.titleColor || 'text-gray-100') : 'text-gray-500'}`}>{title}</Text>

      {editable ? (
        <View className="border-2 border-black-200 w-full h-14 px-4 bg-black-100 rounded-2xl focus:border-secondary items-center flex-row">
          <TextInput
            className="flex-1 font-psemibold text-base"
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#7b7b8b"
            onChangeText={handleChangeText}
            secureTextEntry={props.secureTextEntry || false}
            autoCapitalize="none"
            style={{ color: textColor }}  // Apply text color
          />
        </View>
      ) : (
        <View className="border-2 border-black-200 w-full h-14 px-4 rounded-2xl flex-row items-center" style={{ backgroundColor: '#0f0f18' }}>
          <Text style={{ color: '#555568', flex: 1, letterSpacing: secret ? 4 : 0 }} className="font-psemibold text-base">
            {secret ? '••••••' : (value || placeholder)}
          </Text>
        </View>
      )}
    </View>
  );
};



export default FormField