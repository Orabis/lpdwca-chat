const offlineBadge = document.getElementById('offline-mode')

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().catch((err) => {
    console.error('Notification permission request failed:', err)
  })
}

window.showNotification = function (title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/favicon.svg',
      })
    } catch (e) {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.showNotification(title, {
              body: body,
              icon: '/favicon.svg',
            })
          })
          .catch((err) => {
            console.error('Service worker notification failed:', err)
          })
      }
    }
  }
}

function updateNetworkStatus() {
  if (navigator.onLine) {
    offlineBadge.style.display = 'none'
  } else {
    offlineBadge.style.display = 'block'
    window.showNotification('Mode hors ligne', 'Connexion perdue. Vos messages seront mis en attente.')
  }
}

updateNetworkStatus()

window.addEventListener('online', updateNetworkStatus)
window.addEventListener('offline', updateNetworkStatus)
