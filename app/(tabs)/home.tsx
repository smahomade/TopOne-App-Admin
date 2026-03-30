import { View, Text, FlatList, Image, TouchableOpacity, Modal, Button } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const Home = () => {
  const [session, setSession] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [selectedImage, setSelectedImage] = useState(null); // Store selected image URI
  const [showModal, setShowModal] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null); // Store currently clicked item ID for updating

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // If session exists, retrieve user name
      if (session && session.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', session.user.id)
          .single();

        if (data) {
          setUserName(data.first_name);
        }
      }
    };

    getSession();
  }, []);

  const data = [
    { id: 1, thumbnail: images.banner1, title: "Book Appointment?", description: "Fast book your appointment by Clicking Here" },
    { id: 2, thumbnail: images.banner2, title: "Video 2", description: "Advanced techniques and more." },
    { id: 3, thumbnail: 'https://via.placeholder.com/150', title: "Video 3", description: "Tips and tricks that will make your work easier." }
  ];

  // Handle image selection
  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.uri);
    }
  };

  // Upload the selected image to Supabase (or update the current image in the list)
  const handleImageUpload = async () => {
    if (selectedImage) {
      try {
        // Upload the image to Supabase storage
        const fileName = `${currentItemId}-${Date.now()}.jpg`; // Unique file name
        const { data, error } = await supabase.storage
          .from('images') // Assuming you have a Supabase storage bucket called 'images'
          .upload(fileName, {
            uri: selectedImage,
            type: 'image/jpeg',
            name: fileName,
          });

        if (error) throw error;

        // After successful upload, you may update the data list with the new image URL.
        const imageUrl = supabase.storage
          .from('images')
          .getPublicUrl(fileName)
          .publicURL;

        // Update the data array to reflect the new image (for simplicity, we're mutating the array here)
        const updatedData = data.map(item =>
          item.id === currentItemId ? { ...item, thumbnail: imageUrl } : item
        );

        setSelectedImage(null);
        setShowModal(false);
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }
  };

  return (
    <SafeAreaView>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="mb-4 relative">
            <TouchableOpacity onPress={() => {
              setCurrentItemId(item.id);
              setShowModal(true);
            }}>
              <Image
                source={typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail}
                style={{ width: '100%', height: 180, borderRadius: 15 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={{ position: 'absolute', right: 20, top: 20, maxWidth: '40%' }}>
              <Text style={{ fontSize: 22.5, color: '#fff', fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ fontSize: 16, color: '#fff', flexWrap: 'wrap' }}>{item.description}</Text>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View className="my-6 px-4 space-y-2">
            <View className="justify-between items-start flex-row mb-6">
              <View>
                <Text className="font-pmedium text-sm">Welcome</Text>
                <Text className="text-2xl font-psemibold">{userName}</Text>
              </View>
              <View className="mt-1.5">
                <Image 
                  source={images.logoTopOneSmall}
                  style={{ width: 120, height: 60 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View className="w-full flex-1 pb-2">
              {/* Location Button */}
              <TouchableOpacity onPress={() => router.push('/(extras)/location')}>
                <Text style={{ color: '#8ED1FC', fontSize: 16 }}>
                  Richmond Salon (Default)
                </Text>
              </TouchableOpacity>
              
              {/* Home Text */}
              <Text className="text-2xl font-pregular mt-2">Home</Text>
            </View>
          </View>
        )}
      />

      {/* Image Upload Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Upload New Image</Text>
            <Button title="Pick Image" onPress={handleImagePick} />
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: 100, height: 100, marginTop: 20, borderRadius: 10 }}
              />
            )}
            <Button title="Upload" onPress={handleImageUpload} disabled={!selectedImage} />
            <Button title="Cancel" onPress={() => setShowModal(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;
