import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Tabs } from 'expo-router';
import { icons } from '../../constants';
import { StatusBar } from 'expo-status-bar';

type TabIconProps = {
  icon: ImageSourcePropType;
  color: string;
  name: string;
  focused: boolean;
  noTint?: boolean;
  size?: number;
};

const TabIcon = ({ icon, color, name, focused, noTint, size = 24 }: TabIconProps) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={noTint ? undefined : color}
        style={{ width: size, height: size }}
      />
      <Text
        style={{ 
          fontWeight: focused ? '600' : '400',
          fontSize: 12,
          color 
        }}
      >
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  return (
    <>
      <StatusBar backgroundColor="#161622" style="dark" />

      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#8ED1FC',
          tabBarInactiveTintColor: '#CDCDE0',
          tabBarStyle: {
            backgroundColor: '#161622',
            borderTopWidth: 1,
            borderTopColor: '#232533',
            height: 84,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.home} color={color} name="Home" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="services"
          options={{
            title: 'Services',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.scissors} color={color} name="Services" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="collections"
          options={{
            title: 'Collections',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.comb} color={color} name="Collections" focused={focused} noTint size={24} />
            ),
          }}
        />

        <Tabs.Screen
          name="book"
          options={{
            title: 'Messages',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.bookmark} color={color} name="Messages" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.profile} color={color} name="Profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  );
};

export default TabsLayout;