/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-return-assign */
import React, { Component } from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import Color, { colorYiq } from '../tools/Color'
import Header from '../components/Header'
import Button from '../components/Button'
import Input from '../components/Input'
import cancellablePromise from '../tools/cancellablePromise.js'
import { REST_API_URL } from '../tools/Define'

export default class Forgot extends Component {
  constructor(props) {
    super(props)
    this.state = {
      email: '',
      loading: false
    }
  }

  pendingPromises = []
  appendPendingPromise = promise => this.pendingPromises = [...this.pendingPromises, promise]
  removePendingPromise = promise => this.pendingPromises = this.pendingPromises.filter(p => p !== promise)

  componentWillUnmount() {
    this.pendingPromises.map(p => {
      this.removePendingPromise(p)
    })
  }

  _reset = () => {
    this.setState({
      loading: true
    }, () => {
      const wrappedPromise = cancellablePromise(this._promiseReset())
      this.appendPendingPromise(wrappedPromise)
      wrappedPromise.promise
        .then(res => {
          if(res.status === 'EMPTY') {
            Alert.alert(
              'Tidak terdaftar',
              'Email yang anda masukan tidak terdaftar'
            )
          } else if(res.status === 'OK') {
            Alert.alert(
              'Terkirim!',
              'Ikuti instruksi yang dikirim ke Email anda untuk me-reset password'
            )
          } else {
            Alert.alert(
              'Gagal',
              'Ada kesalahan yang tidak diketahui'
            )
          }
        })
        .then(() => {
          this.removePendingPromise(wrappedPromise)
          this.setState({
            loading: false
          })
        })
        .catch(_err => {
          Alert.alert(
            'Koneksi gagal',
            'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.'
          )
        })
    })
  }

  _promiseReset = () => {
    return new Promise((resolve, reject) => {
      fetch(`${REST_API_URL}reset-password/driver`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'resetPasswordEmail': this.state.email
        })
      })
        .then(res => res.json())
        .then(resolve)
        .catch(reject)
    })
  }

  render() {
    return (
      <View style={{ flex: 1 }} >
        <Header goBack navigation={this.props.navigation} title='Reset Password' />
        <ScrollView>
          <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
            <View style={{ paddingHorizontal: 30, alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Lupa Password</Text>
              <Text style={{ color: Color.textMuted, textAlign: 'center' }}>Silakan masukan alamat email anda untuk me-reset kata sandi</Text>
            </View>
            <Input
              value={this.state.value}
              onChangeText={
                email => this.setState({ email })
              }
              autoCapitalize='none'
              placeholder='ekomardiatno@domain.com'
              keyboardType='email-address'
              style={{ marginBottom: 15 }}
              iconName='at'
            />
            {
              this.state.loading ?
                <View style={{ borderRadius: 4, backgroundColor: Color.primary, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 5 }}>
                  <ActivityIndicator size='small' color={colorYiq(Color.primary)} />
                </View>
                :
                <Button color={Color.yellow} onPress={this._reset} title='Reset Password' />
            }
          </View>
        </ScrollView>
      </View >
    )
  }
}