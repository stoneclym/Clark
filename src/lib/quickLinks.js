export const QUICK_LINKS = [
  {
    id: 'outlook',
    label: 'Outlook',
    iconLight: '/icons/outlook-light.png',
    iconDark: '/icons/outlook-dark.png',
    deepLink: 'ms-outlook://',
    webUrl: 'https://outlook.office.com/mail/',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    iconLight: '/icons/canvas-light.png',
    iconDark: '/icons/canvas-dark.png',
    deepLink: 'canvas-courses://',
    webUrl: 'https://nhcs.instructure.com',
  },
  {
    id: 'ic',
    label: 'Infinite Campus',
    iconLight: '/icons/ic-light.png',
    iconDark: '/icons/ic-dark.png',
    deepLink: 'shortcuts://run-shortcut?name=Open%20Campus%20Student',
    webUrl: 'https://650.ncsis.gov/campus/portal/students/psu650nhcs.jsp',
  },
]

function openExternal(url) {
  const externalWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (externalWindow) externalWindow.opener = null
}

export function openApp(deepLink, webUrl) {
  if (!deepLink) {
    openExternal(webUrl)
    return
  }

  // Try the native-app scheme from the current PWA window so iOS treats it
  // like a user-initiated app handoff, not a blocked popup or hidden frame.
  // If the app opens, Clark becomes hidden and we skip the web fallback.
  let openedNative = false
  const markOpenedNative = () => {
    if (document.visibilityState === 'hidden') openedNative = true
  }
  document.addEventListener('visibilitychange', markOpenedNative, { once: true })

  window.location.href = deepLink

  setTimeout(() => {
    document.removeEventListener('visibilitychange', markOpenedNative)

    if (!openedNative && document.visibilityState === 'visible') {
      openExternal(webUrl)
    }
  }, 1600)
}
