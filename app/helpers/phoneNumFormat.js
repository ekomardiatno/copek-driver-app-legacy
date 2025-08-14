const numFormatWa = (val) => {
  if(val.substr(0,2) === '08') {
    val = '+62' + val.slice(1, val.length)
  }

  return val
}

export default numFormatWa