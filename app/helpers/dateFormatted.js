export default function dateFormatted(date, time = false, chat = false) {
  if (typeof date !== 'object') {
    let y = parseInt(date.substr(0,4))
    let m = parseInt(date.substr(5,2)) - 1
    let d = parseInt(date.substr(8,2))
    let h = parseInt(date.substr(11,2))
    let i = parseInt(date.substr(14,2))
    let s = parseInt(date.substr(17,2))
    date = new Date(y, m, d, h, i, s)
  }

  let now = new Date()

  let diffDateValue = Math.floor(Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / (24 * 60 * 60 * 1000)))
  let diffHoursValue = Math.floor(Math.floor((now.getTime() - date.getTime()) / (60 * 60 * 1000)))
  let diffMinutesValue = Math.floor(Math.floor((now.getTime() - date.getTime()) / (60 * 1000)))
  diffMinutesValue = diffHoursValue * 60 + diffMinutesValue
  let dateInfo = ''
  let hours = date.getHours()
  let minutes = date.getMinutes()
  hours = hours.toString().length < 2 ? `0${hours}` : hours
  minutes = minutes.toString().length < 2 ? `0${minutes}` : minutes
  if (diffDateValue === 0) {
    if (!chat) {
      if (diffMinutesValue <= 0) {
        dateInfo = 'Baru saja'
        time = false
      } else if (diffMinutesValue < 60) {
        dateInfo = diffMinutesValue + ' menit yang lalu'
        time = false
      } else if (diffHoursValue <= 10) {
        dateInfo = diffHoursValue + ' jam yang lalu'
        time = false
      } else {
        dateInfo = 'Hari ini'
      }
    } else {
      dateInfo = ''
    }
  } else if (diffDateValue === 1) {
    dateInfo = 'Kemarin'
  } else {
    let d = date.getDate()
    d = d.toString().length < 2 ? `0${d}` : d
    let m = date.getMonth()
    let y = date.getFullYear()
    switch (m) {
      case 0:
        m = 'Jan'
        break
      case 1:
        m = 'Feb'
        break
      case 2:
        m = 'Mar'
        break
      case 3:
        m = 'Apr'
        break
      case 4:
        m = 'Mei'
        break
      case 5:
        m = 'Jun'
        break
      case 6:
        m = 'Jul'
        break
      case 7:
        m = 'Agu'
        break
      case 8:
        m = 'Sep'
        break
      case 9:
        m = 'Okt'
        break
      case 10:
        m = 'Nov'
        break
      case 11:
        m = 'Des'
        break
    }
    dateInfo = `${d} ${m} ${y}`
  }

  if (time) {
    if (chat) {
      if (diffDateValue === 0) {
        return `${hours}:${minutes}`
      } else {
        return `${dateInfo}, ${hours}:${minutes}`
      }
    } else {
      return `${dateInfo}, ${hours}:${minutes}`
    }
  } else {
    return `${dateInfo}`
  }

}