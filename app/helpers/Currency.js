export default function Currency(val) {
  val = typeof val == 'number' ? val.toFixed(0) : val
  val = val.toString()
  var mod = val.length % 3,
      currency = val.substr(0, mod),
      thousand = val.substr(mod).match(/\d{3}/g),
      separator = ''
  if(thousand) {
    separator = mod ? ',' : ''
    currency += separator + thousand.join(',')
  }

  return 'Rp' + currency
}