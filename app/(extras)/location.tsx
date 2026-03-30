import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';

const Location = () => {
  const data = [
    { id: 1, thumbnail: images.richmondBanner, title: "Richmond Salon", description: "31 the Quadrant, Surrey, TW9 1DN" },
    { id: 2, thumbnail: 'https://via.placeholder.com/150', title: "", description: "" },
    { id: 3, thumbnail: 'https://via.placeholder.com/150', title: "", description: "" }
  ];

  return (
    <SafeAreaView>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="mb-4 relative">
            <Image
              source={typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail}
              style={{ width: '100%', height: 180, borderRadius: 15 }}
              resizeMode="cover"
            />
            {/* Dark overlay */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', borderRadius: 15 }} />
            {/* Centered text */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 35, color: '#fff', fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ fontSize: 16, color: '#fff', textAlign: 'center', marginHorizontal: 10 }}>{item.description}</Text>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View className="px-4 space-y-2">
            <View className="items-center">
              <View className="mt-1.5 my-2">
                <Image 
                  source={images.logoTopOneSmall}
                  style={{ width: 120, height: 60 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View className="w-full flex-1 pb-2 items-center">
              <Text className="text-4xl font-pregular my-2">Location</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Location;
