const modalEditProfile = document.getElementById('modal-edit-profile')
const formEditProfile = document.getElementById('form-edit-profile')
const inputProfileName = document.getElementById('edit-profile-name')
const btnCloseProfileModal = document.getElementById('btn-close-profile-modal')
const btnEditProfile = document.getElementById('btn-edit-profile')
const currentUserName = document.getElementById('current-user-name')
const currentUserAvatar = document.getElementById('current-user-avatar')
const btnCancelProfileModal = document.getElementById('btn-cancel-profile-modal')

let myProfile = JSON.parse(localStorage.getItem('myProfile')) || null

// Met à jour le nom et la première lettre de l'avatar sur la page
function updateProfileUI() {
  if (myProfile) {
    currentUserName.textContent = myProfile.name
    currentUserAvatar.textContent = myProfile.name.charAt(0).toUpperCase()
  }
}

// Ouvre la fenêtre pour modifier son pseudo
function openProfileModal() {
  modalEditProfile.style.display = 'flex'
  if (myProfile) {
    inputProfileName.value = myProfile.name
  } else {
    inputProfileName.value = ''
    btnCancelProfileModal.style.display = 'none'
  }
  inputProfileName.focus()
}

// Ferme la fenêtre du profil
function closeProfileModal() {
  modalEditProfile.style.display = 'none'
}

// Sauvegarde le nouveau pseudo dans le localStorage et prévient le reste de l'appli
formEditProfile.addEventListener('submit', (e) => {
  e.preventDefault()
  const name = inputProfileName.value.trim()

  if (name) {
    myProfile = { id: 'me', name: name }
    localStorage.setItem('myProfile', JSON.stringify(myProfile))
    updateProfileUI()
    closeProfileModal()
    btnCancelProfileModal.style.display = 'inline-block'
    document.dispatchEvent(new CustomEvent('profile-updated', { detail: myProfile }))
  }
})

btnEditProfile.addEventListener('click', openProfileModal)
btnCloseProfileModal.addEventListener('click', closeProfileModal)
btnCancelProfileModal.addEventListener('click', closeProfileModal)

if (!myProfile) {
  openProfileModal()
} else {
  updateProfileUI()
}
