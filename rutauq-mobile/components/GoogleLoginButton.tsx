import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';

// WebView is only available on native — lazy require avoids web bundling errors
const NativeWebView =
  Platform.OS !== 'web'
    ? (require('react-native-webview').WebView as typeof import('react-native-webview').WebView)
    : null;

const REDIRECT_URI = 'https://localhost';

function buildAuthUrl(clientId: string): string {
  const nonce = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    response_type: 'id_token',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface Props {
  loading?: boolean;
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
}

export function GoogleLoginButton({ loading, onToken, onError }: Props) {
  const [visible, setVisible] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState('');

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

  const openModal = () => {
    if (!clientId) {
      onError('Google login no está configurado.');
      return;
    }
    setAuthUrl(buildAuthUrl(clientId));
    setWebLoading(true);
    setVisible(true);
  };

  const handleNavigationRequest = (request: { url: string }) => {
    if (request.url.startsWith(REDIRECT_URI)) {
      setVisible(false);
      const fragment = request.url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const idToken = params.get('id_token');
      if (idToken) {
        onToken(idToken);
      } else {
        onError('No se pudo obtener el token de Google.');
      }
      return false;
    }
    return true;
  };

  // On web react-native-webview is unavailable; show the button as disabled
  if (Platform.OS === 'web') {
    return (
      <Button variant="outline" size="lg" disabled>
        Iniciar sesión con Google
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        loading={loading}
        disabled={loading}
        onPress={openModal}
      >
        Iniciar sesión con Google
      </Button>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
            <TouchableOpacity onPress={() => setVisible(false)} accessibilityRole="button">
              <Text style={{ color: '#2563eb', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {webLoading && (
            <ActivityIndicator
              size="large"
              color="#2563eb"
              style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}
            />
          )}

          {!!authUrl && NativeWebView && (
            <NativeWebView
              source={{ uri: authUrl }}
              onShouldStartLoadWithRequest={handleNavigationRequest}
              onLoadStart={() => setWebLoading(true)}
              onLoadEnd={() => setWebLoading(false)}
              style={{ flex: 1 }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
