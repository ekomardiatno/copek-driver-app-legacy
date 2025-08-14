/* eslint-disable react-native/no-inline-styles */
import React, { Component } from 'react'
import { View, Text } from 'react-native'
import Header from '../components/Header'
import Color from '../tools/Color'

export default class Topup extends Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Header goBack navigation={this.props.navigation} title='Top-Up' />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Top Up!</Text>
          <Text style={{ textAlign: 'center', lineHeight: 18, color: Color.textMuted }}>Saat ini top-up saldo hanya dapat dilakukan manual di kantor COPEK</Text>
        </View>
      </View>
    )
  }
}