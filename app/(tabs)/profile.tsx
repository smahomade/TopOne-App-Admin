import { useState, useEffect
 } from 'react'
import { supabase } from '../../lib/supabase'
import Auth from '../../components/Auth'
import Account from '../../components/Account'
import { StatusBar, View, Image } from 'react-native'
import { images } from '../../constants'
import { Session } from '@supabase/supabase-js'
import { useNavigation } from 'expo-router'

export default function App() {


  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <>
    <View style={{ flex: 1, backgroundColor: '#161622' }}>
      <View style={{ alignItems: 'center', paddingTop: 52, paddingBottom: 12 }}>
        <Image
          source={images.logoTopOneWhite}
          style={{ width: 160, height: 64 }}
          resizeMode="contain"
        />
      </View>
      {session && session.user ? <Account key={session.user.id} session={session} /> : <Auth />}
    </View>
    </>
  )
}