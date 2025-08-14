import React, { Component } from 'react'
import { View, Text } from 'react-native'
import Header from '../../components/Header'
import Color, {colorYiq} from '../../tools/Color'

export default class Messages extends Component {
  render() {
    return (
      <View style={{flex: 1}}>
        <Header title='Inbox' />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Belum ada pesan masuk!</Text>
          <Text style={{ textAlign: 'center', lineHeight: 18, color: Color.textMuted }}>Selalu cek pesan masuk untuk mendapatkan saran penggunaan dan informasi terbaru dari kami.</Text>
        </View>
      </View>
    )
  }
}