/* eslint-disable react-native/no-inline-styles */
import { Component } from 'react';
import { View, TextInput, Text, TouchableNativeFeedback } from 'react-native';
import Color from '../tools/Color';
import Icon from '@react-native-vector-icons/fontawesome5';

class Input extends Component {
  render() {
    return (
      <View style={{ borderColor: Color.borderColor, borderWidth: 1, flexDirection: 'row', borderRadius: 4, backgroundColor: Color.grayLighter, ...this.props.style }}>
        {
          this.props.appendLeftText &&
          <View style={{alignItems: 'center', justifyContent: 'center', paddingLeft: 10}}>
            <Text style={{fontWeight: 'bold', color: Color.gray}}>{this.props.appendLeftText}</Text>
          </View>
        }
        <TextInput keyboardType={this.props.keyboardType} autoCapitalize={this.props.autoCapitalize} onChangeText={this.props.onChangeText} value={this.props.value} placeholderTextColor={Color.gray} secureTextEntry={this.props.secureTextEntry} style={{ flex: 1, paddingLeft: 12, fontFamily: 'Archivo', color: Color.black, paddingVertical: 12, letterSpacing: this.props.password ? 10 : 1 }} placeholder={this.props.placeholder} />
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 40 }}>
          <Icon iconStyle='solid' name={this.props.iconName} color={this.props.error ? Color.red : Color.gray} size={20} />
        </View>
        {
          this.props.password &&
            <TouchableNativeFeedback
              onPress={this.props.changeSecureText}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 40 }}>
                <Icon iconStyle='solid' name={this.props.secureTextEntry ? 'eye-slash' : 'eye'} color={this.props.error ? Color.red : Color.gray} size={20} />
              </View>
            </TouchableNativeFeedback>
        }
      </View>
    )
  }
}

export default Input