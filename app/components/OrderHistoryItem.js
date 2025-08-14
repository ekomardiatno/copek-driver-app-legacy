/* =================================
 * Components by Eko Mardiatno
 * Instagram @komafx
 * ekomardiatno@gmail.com
 * ================================= */

import { Component } from 'react'
import {
  View,
  Text,
  TouchableNativeFeedback,
} from 'react-native'
import Color, { colorYiq } from '../tools/Color'
import Fa from '@react-native-vector-icons/fontawesome5'

export default class OrderHistoryItem extends Component {
  render() {
    let statusText = 'on-progress'
    let statusColor = Color.primary
    let iconName = 'user'
    let iconColor = Color.blue
    switch(this.props.status) {
      case 'cancelled_by_user':
        statusText = 'cancelled'
        statusColor = Color.red
        break
      case 'cancelled_by_driver':
        statusText = 'cancelled'
        statusColor = Color.red
        break
      case 'completed':
        statusText = 'completed'
        statusColor = Color.green
        break
      default:
        statusText = 'on-progress'
        statusColor = Color.primary
    }

    switch(this.props.type) {
      case 'RIDE':
        iconName = 'user'
        iconColor = Color.blue
        break
      case 'FOOD':
        iconName = 'utensils'
        iconColor = Color.red
        break
    }
    return (
      <TouchableNativeFeedback
        useForeground={true}
        background={TouchableNativeFeedback.Ripple('rgba(0,0,0,.15', false)}
        onPress={this.props.onPress}
      >
        <View style={{ paddingHorizontal: 15 }}>
          <View style={{ paddingVertical: 15, borderBottomWidth: this.props.last ? 0 : 1, borderBottomColor: Color.grayLight }}>
            <View style={{ flexDirection: 'row' }}>
              <View>
                <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: iconColor }}>
                  <Fa iconStyle='solid' color={colorYiq(iconColor)} size={20} name={iconName} />
                </View>
              </View>
              <View style={{ flex: 1, paddingLeft: 15, paddingVertical: 2 }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 11, color: Color.textMuted, marginBottom: 6 }}>{this.props.dateTime}</Text>
                    <View style={{ position: 'relative', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 8, marginTop: 6, borderWidth: 2, borderColor: Color.grayLight }} />
                        <View>
                          <Text style={{ fontWeight: 'bold' }}>{this.props.origin.geocode.title}</Text>
                          <Text numberOfLines={1} style={{ fontSize: 11 }}>{this.props.origin.geocode.address}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 8, marginTop: 6, backgroundColor: Color.primary }} />
                        <View>
                          <Text style={{ fontWeight: 'bold' }}>{this.props.destination.geocode.title}</Text>
                          <Text numberOfLines={1} style={{ fontSize: 11 }}>{this.props.destination.geocode.address}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontWeight: 'bold' }}>{this.props.fare}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', backgroundColor: statusColor, color: colorYiq(statusColor), borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1.5 }}><Fa iconStyle='solid' name='hashtag' color={colorYiq(statusColor)} />{statusText}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableNativeFeedback>
    )
  }
}