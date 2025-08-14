import { APP_HOST } from "../tools/Define";

const getImageThumb = (file, size) => {
  switch (size) {
    case 'lg':
      size = 'large';
      break;
    case 'md':
      size = 'medium';
      break;
    case 'sm':
      size = 'small';
      break;
    case 'xs':
      size = 'xsmall';
      break;
    case 'xxs':
      size = 'xxsmall';
      break;
  }

  file = file.split('/')
  const indexEnd = file.length - 1
  file[indexEnd] = size + '-' + file[indexEnd]
  let thumb = ''
  for(let i = 0;i<file.length;i++) {
    thumb += file[i] + (indexEnd === i ? '' : '/')
  }

  return `${APP_HOST}${thumb.at(0) === '/' ? thumb.substring(1) : thumb}`
}

export default getImageThumb