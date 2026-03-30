import { View, Text, Image } from 'react-native'
import { Tabs, Redirect, useNavigation} from 'expo-router'
import Home from './home'
import { icons } from '../../constants';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const TabIcon = ({ icon, color, name, focused }) => {
    return(
        <View className="items-center justify-center gap-2">
            <Image
                source={icon} 
                resizeMode='contain'
                tintColor={color}
                className="w-6 h-6"
             />

             <Text className={`${focused ? 'font-psemibold': 'font-pregular'} text-xs`}
                    style={{color:color}}
                    >
                {name}
             </Text>
        </View>  
    )
}

const TabsLayout = () => {
  return (
    <>
    <StatusBar backgroundColor='#161622' style='dark'/>
  
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#8ED1FC', //This is the 'color' variable
                tabBarInactiveTintColor: '#CDCDE0', // this is the 'color' variable
                tabBarStyle:{
                    backgroundColor: '#161622',
                    borderTopWidth: 1,
                    borderTopColor: '#232533',
                    height: 84,
                }

            }}
        >
            <Tabs.Screen
            name='home'
            options={{
                title: 'Home',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.home}
                        color={color}
                        name="Home"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='services'
            options={{
                title: 'Services',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.scissors}
                        color={color}
                        name="Services"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='pricelist'
            options={{
                title: 'Pricelist',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.eyeHide}
                        color={color}
                        name="Extra"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='profile'
            options={{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.profile}
                        color={color}
                        name="Profile"
                        focused={focused}
                     />
                )
            }}
            />
        
        </Tabs>
     
        
    </>
  )
}

export default TabsLayout