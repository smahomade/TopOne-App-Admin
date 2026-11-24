import { TouchableOpacity ,View, Text } from 'react-native'
import React from 'react'

const CustomButton = ({title, handlePress, containerStyles, textStyles, isLoading, backgroundColor = '#1A1817', textColor = '#F4F1EC' }) => {
  return (

    <TouchableOpacity 
    onPress={handlePress}
    activeOpacity={0.7}
    className= {`rounded-xl min-h-[62px] justify-center items-center 
    ${containerStyles} ${isLoading ? 'opacity-50' : ''}`}
    disabled={isLoading}
    style={{ backgroundColor }}
      
    >

        <Text className ={`font-psemibold text-lg ${textStyles}`} style={{ color: textColor }}>
          {title}
        
        </Text>
        

    </TouchableOpacity>
  )
}

export default CustomButton