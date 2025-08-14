import React, { Component } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import Color, {colorYiq} from '../tools/Color'

export default class Card extends Component {
  render() {
    return (
      <View style={{borderTopWidth: 10, borderTopColor: Color.grayLighter, backgroundColor: Color.white, borderBottomWidth: 1, borderBottomColor: Color.borderColor}}>
        {
          this.props.headerTitle &&
          <View style={{paddingHorizontal: 15}}>
            <View style={[{flexDirection: 'row', paddingVertical: 15, borderBottomColor: Color.borderColor, borderBottomWidth: 1}, this.props.headerStyleGray && {
              borderBottomWidth: 0
            }]}>
              <View style={{flex: 1}}>
                <Text style={[{fontWeight: 'bold'}, this.props.headerStyleGray && {
                  color: Color.textMuted, textTransform: 'uppercase', fontSize: 13
                }]}>{this.props.headerTitle}</Text>
              </View>
              {
                this.props.btnTitle &&
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={this.props.btnLeft}
                >
                  <Text style={{fontWeight: 'bold', color: Color.secondary}}>{this.props.btnTitle}</Text>
                </TouchableOpacity>
              }
            </View>
          </View>
        }
        <View style={this.props.bodyStyle}>
          {this.props.body}
        </View>
      </View>
    )
  }
}