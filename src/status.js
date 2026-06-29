const offlineBadge = document.getElementById('offline-mode')

function updateNetworkStatus() {
  if (navigator.onLine) {
    offlineBadge.style.display = 'none'
  } else {
    offlineBadge.style.display = 'block'
  }
}

updateNetworkStatus()

window.addEventListener('online', updateNetworkStatus)
window.addEventListener('offline', updateNetworkStatus)
