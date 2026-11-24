import { View, Text, Image, type ColorValue, type ImageSourcePropType } from 'react-native';
import { Tabs } from 'expo-router';
import { icons } from '../../constants';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of the icon-and-label area, not counting the phone's own navigation
// bar or home indicator underneath it.
const TAB_BAR_CONTENT_HEIGHT = 64;

type TabIconProps = {
  icon: ImageSourcePropType;
  color: ColorValue;
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
      {/* One line, and only a little bigger with large phone text sizes:
          five tabs share a small phone's width. */}
      <Text
        style={{
          fontWeight: focused ? '600' : '400',
          fontSize: 12,
          color
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.15}
      >
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  // Android now draws the app under the system navigation bar (as iOS always
  // has), and the tab bar pads itself by that much, so add it on top.
  const { bottom } = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="dark" />

      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          // The tab bar now boxes icons to 31x28 at the top of each tab, which
          // wraps our labels and pushes icon and label up to the top edge.
          tabBarIconStyle: { width: '100%', height: '100%' },
          tabBarActiveTintColor: '#8ED1FC',
          tabBarInactiveTintColor: '#CDCDE0',
          tabBarStyle: {
            backgroundColor: '#161622',
            borderTopWidth: 1,
            borderTopColor: '#232533',
            height: TAB_BAR_CONTENT_HEIGHT + bottom,
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