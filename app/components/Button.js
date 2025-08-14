import React, { Component } from 'react';
import { View, TouchableNativeFeedback, Text } from 'react-native';
import { colorYiq } from '../tools/Color';

class Button extends Component {
  render() {
    return (
      <View>
        <TouchableNativeFeedback
          onPress={this.props.onPress}
          useForeground={true}
          background={TouchableNativeFeedback.Ripple('rgba(0,0,0,.15)', false)}
        >
          <View style={{ paddingHorizontal: 15, height: 40, paddingVertical: 10, backgroundColor: this.props.color, borderRadius: 4, overflow: 'hidden', elevation: 5, ...this.props.style }}>
            <Text style={{ textAlign: 'center', color: colorYiq(this.props.color) }}>{this.props.title}</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    )
  }
}

export default Button