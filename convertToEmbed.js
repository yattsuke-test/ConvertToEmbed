const youtubeEmbedTemplate = [
    '<iframe width="560" height="315" src="https://www.youtube.com/embed/',
    '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
]

const nicoSourceTemplate = [
    'https://embed.nicovideo.jp/watch/'
    ,'?persistence=1&oldScript=1&referer=&from=0&allowProgrammaticFullScreen=1'
]


function getIdFromNicoURL(url, start) {
  let movieId = ''
  for (let i = start; i < url.length; i++) {
    if (url[i] == '?') {
      return movieId
    }
    movieId += url[i]
  }
  return movieId
}


function createNicoIframeAndReplace(attributes, replaceNode) {
    const iframeElement = document.createElement('iframe');
    iframeElement.setAttribute('allowfullscreen', 'allowfullscreen');
    iframeElement.setAttribute('allow', 'autoplay');
    iframeElement.setAttribute('frameborder', '0');
    iframeElement.width = attributes.width.toString();
    iframeElement.height = attributes.height.toString();
    iframeElement.src = attributes.src;
    replaceNode.replaceWith(iframeElement);
    if (window.getComputedStyle(iframeElement).getPropertyValue('max-width') === 'none') {
        iframeElement.style.maxWidth = '100%';
    }
    return iframeElement;
}


function programmaticFullScreen (iframe) {
  let stylesToModify = [
      'width',
      'height',
      'top',
      'left',
      'position',
      'z-index',
      'max-width',
      'transform',
      '-webkit-transform',
      'transform-origin',
      '-webkit-transform-origin'
  ];
  let originalStyles = stylesToModify.reduce((acc, style) => {
      acc[style] = {
          value: iframe.style.getPropertyValue(style),
          priority: iframe.style.getPropertyPriority(style)
      };
      return acc;
  }, {});
  let timer;
  let ended = false;
  let initialScrollX = window.scrollX;
  let initialScrollY = window.scrollY;
  let wasLandscape = null;
  function pollingResize() {
      if (ended) {
          return;
      }
      const isLandscape = window.innerWidth >= window.innerHeight;
      const width = `${isLandscape ? window.innerWidth : window.innerHeight}px`;
      const height = `${isLandscape ? window.innerHeight : window.innerWidth}px`;
      if (iframe.style.width !== width || iframe.style.height !== height) {
          iframe.style.setProperty('width', width, 'important');
          iframe.style.setProperty('height', height, 'important');
          window.scrollTo(0, 0);
      }
      if (isLandscape !== wasLandscape) {
          wasLandscape = isLandscape;
          if (isLandscape) {
              // 回転しない
              iframe.style.setProperty('transform', 'none', 'important');
              iframe.style.setProperty('-webkit-transform', 'none', 'important');
              iframe.style.setProperty('left', '0', 'important');
          }
          else {
              // 回転する
              iframe.style.setProperty('transform', 'rotate(90deg)', 'important');
              iframe.style.setProperty('-webkit-transform', 'rotate(90deg)', 'important');
              iframe.style.setProperty('left', '100%', 'important');
          }
      }
      timer = setTimeout(startPollingResize, 200);
  }
  function startPollingResize() {
      if (window.requestAnimationFrame) {
          window.requestAnimationFrame(pollingResize);
      }
      else {
          pollingResize();
      }
  }
  startPollingResize();
  iframe.style.setProperty('top', '0', 'important');
  iframe.style.setProperty('position', 'fixed', 'important');
  iframe.style.setProperty('z-index', '2147483647', 'important');
  iframe.style.setProperty('max-width', 'none', 'important');
  iframe.style.setProperty('transform-origin', '0% 0%', 'important');
  iframe.style.setProperty('-webkit-transform-origin', '0% 0%', 'important');
  return function () {
      stylesToModify.forEach((style) => {
          const originalStyle = originalStyles[style];
          iframe.style.removeProperty(style);
          iframe.style.setProperty(style, originalStyle.value, originalStyle.priority);
      });
      clearTimeout(timer);
      ended = true;
      window.scrollTo(initialScrollX, initialScrollY);
  };
}


function replaceByNicoIframe (movieId, replaceNode) {
    const src = nicoSourceTemplate[0] + movieId + nicoSourceTemplate[1]
    const iframeElement = createNicoIframeAndReplace({ width: 560, height: 315, src: src }, replaceNode);
    let exitFullScreen = null;
    window.addEventListener('message', (event) => {
        if (event.source !== iframeElement.contentWindow) {
            return;
        }
        if (event.data.eventName === 'enterProgrammaticFullScreen') {
            exitFullScreen || (exitFullScreen = programmaticFullScreen(iframeElement));
        }
        else if (event.data.eventName === 'exitProgrammaticFullScreen') {
            exitFullScreen && exitFullScreen();
            exitFullScreen = null;
        }
    });
}


function createElemFromStr(htmlStr) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr;
    return tempDiv.firstElementChild;
}


function replaceByYoutubeIframe(movieId, replaceElem) {
    const embedStr = youtubeEmbedTemplate[0] + movieId + youtubeEmbedTemplate[1];
    const embedHtml = createElemFromStr(embedStr)
    replaceElem.replaceWith(embedHtml);
}


function convertToEmbed(linkElem) {
    const url = linkElem.href
    let start;
    let movieId;
    
    if (url.includes('nico.ms') || url.includes('nicovideo.jp')) {
        start = url.lastIndexOf('/') + 1;
        movieId = getIdFromNicoURL(url, start)
        replaceByNicoIframe(movieId, linkElem)
    }
    else if (url.includes('youtube.com/watch')) {
        start = url.indexOf('v=') + 2;
        movieId = url.substr(start, 11);
        replaceByYoutubeIframe(movieId, linkElem)
    }
    else if (url.includes('youtu.be') || url.includes('y2u.be')) {
        start = url.lastIndexOf('/') + 1;
        movieId = url.substr(start, 11);
        replaceByYoutubeIframe(movieId, linkElem)
    }
}


function main() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        convertToEmbed(link);
    })
}


main();