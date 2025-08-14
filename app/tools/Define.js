import { Dimensions } from 'react-native'
import Config from 'react-native-config'
const { width, height } = Dimensions.get('window')
const ASPECT_RATIO = width / height
export const LATITUDE_DELTA = 0.02
// export const LATITUDE_DELTA = 0.0922
export const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO
export const APP_HOST = Config.APP_HOST ?? ''
export const EXPRESS_URL = APP_HOST + 'copek-node/'
export const REST_API_URL = APP_HOST + 'copek/api/'
export const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY