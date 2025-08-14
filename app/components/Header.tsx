/* eslint-disable react-native/no-inline-styles */
import { JSX } from 'react';
import {
  View,
  Text,
  TouchableNativeFeedback,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Color from '../tools/Color';
import Icon from '@react-native-vector-icons/fontawesome5';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({
  style,
  rightComponent,
  mainComponent,
  goBack,
  backBtnStyle,
  title
}: {
  rightComponent?: JSX.Element;
  mainComponent?: JSX.Element;
  style?: StyleProp<ViewStyle>;
  goBack?: boolean;
  backBtnStyle?: StyleProp<ViewStyle>
  title?: string
}): JSX.Element {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          paddingHorizontal: 15,
          paddingVertical: 10,
          marginHorizontal: -5,
          paddingTop: 10 + insets.top,
          backgroundColor: Color.white,
          elevation: 2,
        },
        style,
      ]}
    >
      {goBack && (
        <View>
          <TouchableNativeFeedback
            onPress={() => navigation.goBack()}
            useForeground={true}
            background={TouchableNativeFeedback.Ripple(
              'rgba(0,0,0,.15)',
              false,
            )}
          >
            <View
              style={[{
                height: 40,
                marginHorizontal: 5,
                width: 40,
                borderRadius: 40 / 2,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }, backBtnStyle]}
            >
              <Icon
                iconStyle="solid"
                size={18}
                color={Color.black}
                name="chevron-left"
              />
            </View>
          </TouchableNativeFeedback>
        </View>
      )}
      {mainComponent ? (
        <View style={{ flex: 1, marginHorizontal: 5 }}>{mainComponent}</View>
      ) : (
        <View
          style={{
            flex: 1,
            marginHorizontal: 5,
            justifyContent: 'center',
            height: 40,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      )}
      {rightComponent}
    </View>
  );
}
