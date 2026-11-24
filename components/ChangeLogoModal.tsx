import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { LOGO_SETTING_KEY, setSalonLogoUrl, useSalonLogo, useSalonLogoUrl } from '../lib/salonLogo';

// The built-in logo is 1897 × 818, so a new one of about that shape fills the
// same space at the top of every screen.
const BEST_WIDTH = 1900;
const BEST_HEIGHT = 820;

type ChosenImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
};

function getSizeWarning(image: ChosenImage) {
  if (image.width < 800) {
    return 'This image is quite small, so the logo may look blurry. A wider one (about 1900 px) will look sharper.';
  }

  if (image.width / image.height < 1.5) {
    return 'This image is fairly square, so the logo will show smaller than now. A wide logo fits best.';
  }

  return null;
}

const ChangeLogoModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const currentLogo = useSalonLogo();
  const customLogoUrl = useSalonLogoUrl();
  const [chosen, setChosen] = useState<ChosenImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A see-through PNG or WebP is recoloured on the pages, so the preview is too.
  const previewRecolours = chosen
    ? chosen.mimeType === 'image/png' || chosen.mimeType === 'image/webp'
    : !!customLogoUrl && /\.(png|webp)(\?|$)/i.test(customLogoUrl);

  // Starts fresh every time it opens.
  useEffect(() => {
    if (!visible) {
      setChosen(null);
      setError(null);
    }
  }, [visible]);

  const chooseImage = async () => {
    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Allow access to your photos to choose a logo.');
        return;
      }

      // No cropping and full quality, so a PNG keeps its see-through background.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        // An iPhone photo can be HEIC, which not every phone can show: ask
        // for a JPEG copy of those. PNGs stay PNG.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      const asset = result.canceled ? null : result.assets?.[0];

      if (asset?.uri) {
        setChosen({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType ?? (/\.png$/i.test(asset.uri) ? 'image/png' : 'image/jpeg'),
        });
      }
    } catch (pickError: any) {
      setError(pickError?.message || 'Could not open your photos.');
    }
  };

  const saveLogo = async () => {
    if (!chosen) return;

    setSaving(true);
    setError(null);

    try {
      const extension = chosen.mimeType === 'image/png' ? 'png' : chosen.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `logo/logo-${Date.now()}.${extension}`;
      const response = await fetch(chosen.uri);
      // The photo's bytes, as Supabase asks for on phones: a Blob upload can
      // arrive empty or fail outright from an iPhone.
      const fileData = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, fileData, { contentType: chosen.mimeType, upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;

      const { error: saveError } = await supabase
        .from('app_settings')
        .upsert({ key: LOGO_SETTING_KEY, value: publicUrl, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;

      setSalonLogoUrl(publicUrl);
      onClose();
    } catch (saveError: any) {
      setError(saveError?.message || 'Could not save the logo. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const restoreOriginalLogo = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase.from('app_settings').delete().eq('key', LOGO_SETTING_KEY);
      if (deleteError) throw deleteError;

      setSalonLogoUrl(null);
      onClose();
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Could not go back to the original logo. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const sizeWarning = chosen ? getSizeWarning(chosen) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        {/* Capped and scrollable: with a new image chosen, the warning and
            extra buttons don't fit on a small phone otherwise. */}
        <View className="w-full rounded-2xl bg-card" style={{ maxHeight: '90%' }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text className="text-center text-xl text-ink font-psemibold">Change logo</Text>
          <Text className="mt-1 text-center text-sm text-muted font-pregular">
            Shown at the top of the staff and customer apps.
          </Text>

          {/* Shown on the apps' cream background, drawn the way the pages draw it. */}
          <View className="mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#F4F1EC', height: 100 }}>
            <Image
              source={chosen ? { uri: chosen.uri } : currentLogo}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              tintColor={previewRecolours ? '#1A1817' : undefined}
            />
          </View>
          <Text className="mt-2 text-center text-xs text-muted font-pregular">
            {chosen ? `New logo · ${chosen.width} × ${chosen.height} px` : 'Current logo'}
          </Text>

          {sizeWarning ? (
            <Text className="mt-2 text-center text-xs font-pregular" style={{ color: '#1A1817' }}>
              {sizeWarning}
            </Text>
          ) : null}

          <View className="mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(26, 24, 23, 0.08)' }}>
            <Text className="text-sm text-ink font-psemibold">For the best result</Text>
            {[
              `About ${BEST_WIDTH} × ${BEST_HEIGHT} px, a wide shape`,
              'PNG with a see-through background',
              'One colour: the apps show it black on cream and white on photos',
            ].map((tip) => (
              <View key={tip} className="mt-1 flex-row items-start">
                <Text className="mr-2 text-xs text-ink font-pregular">•</Text>
                <Text className="flex-1 text-xs leading-5 text-muted font-pregular">{tip}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <Text className="mt-3 text-center text-sm font-pregular" style={{ color: '#B3261E' }}>
              {error}
            </Text>
          ) : null}

          {chosen ? (
            <TouchableOpacity
              onPress={saveLogo}
              disabled={saving}
              activeOpacity={0.8}
              className="mt-5 min-h-[56px] items-center justify-center rounded-xl bg-ink"
            >
              {saving ? (
                <ActivityIndicator color="#F4F1EC" />
              ) : (
                <Text className="text-base text-cream font-psemibold">Save new logo</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={chooseImage}
            disabled={saving}
            activeOpacity={0.8}
            className={`min-h-[56px] items-center justify-center rounded-xl ${chosen ? 'mt-3 border border-ink' : 'mt-5 bg-ink'}`}
          >
            <Text className={`text-base font-psemibold ${chosen ? 'text-ink' : 'text-cream'}`}>
              {chosen ? 'Choose a different image' : 'Choose image'}
            </Text>
          </TouchableOpacity>

          {customLogoUrl && !chosen ? (
            <TouchableOpacity onPress={restoreOriginalLogo} disabled={saving} className="mt-3 items-center py-2">
              <Text className="text-sm text-muted font-pregular">Go back to the original TopOne logo</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={onClose} disabled={saving} className="mt-1 items-center py-2">
            <Text className="text-muted font-pregular">Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ChangeLogoModal;
