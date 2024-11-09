// DOMContentLoaded pour s'assurer que le script s'exécute après le chargement de la page
document.addEventListener('DOMContentLoaded', function () {
  // Sélection des boutons de filtre
  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');

  // Vérifiez que les boutons existent avant de tenter d'accéder à leurs propriétés
  if (filterButtons && filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        const category = this.dataset.category;

        // Gestion de la classe active
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        // Vérifiez que les cartes existent également
        if (projectCards && projectCards.length > 0) {
          projectCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        }
      });
    });
  } else {
    console.warn("Aucun bouton de filtre trouvé sur la page.");
  }

  // Exemple d'effet de clic sur le bouton
  const heroButton = document.querySelector('.hero button');
  if (heroButton) {
    heroButton.addEventListener('click', function () {
      // Défilement vers la section des projets
      const projectSection = document.querySelector('#projets');
      if (projectSection) {
        projectSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  } else {
    console.warn("Aucun bouton héro trouvé sur la page.");
  }
});

// Fonction pour basculer l'affichage du menu déroulant
function toggleDropdown() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  // Vérifiez si le menu est actuellement visible
  if (dropdownMenu.style.display === 'flex') {
    dropdownMenu.style.display = 'none'; // Cache le menu
  } else {
    dropdownMenu.style.display = 'flex'; // Affiche le menu
  }
}

// Fermer le menu si l'utilisateur clique en dehors de celui-ci
window.onclick = function(event) {
  const dropdownMenu = document.getElementById('dropdownMenu');
  const usernameDropdown = document.getElementById('usernameDropdown');
  if (!usernameDropdown.contains(event.target) && !dropdownMenu.contains(event.target)) {
    dropdownMenu.style.display = 'none'; // Cache le menu si on clique ailleurs
  }
}

// affihage des commentaire des projets
document.addEventListener('DOMContentLoaded', () => {
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', async function(event) {
      event.preventDefault(); // Empêche la soumission classique du formulaire
      const formData = new FormData(this);
      const response = await fetch(this.action, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const newComments = await fetch(`/comments/${formData.get('projectId')}`).then(res => res.json());
        const commentList = document.querySelector('.comment-list');
        commentList.innerHTML = ''; // Nettoie la liste des commentaires
        newComments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.classList.add('comment');
          commentDiv.innerHTML = `
            <p><strong>${comment.username}</strong></p>
            <p>${new Date(comment.date).toLocaleDateString('fr-FR')}</p>
            <p>${comment.comment}</p>
          `;
          commentList.appendChild(commentDiv);
        });
        this.reset(); // Réinitialise le formulaire
      } else {
        alert('Erreur lors de l\'envoi du commentaire.');
      }
    });
  }
});

// function reactToComment(event) {
//   const commentId = event.target.getAttribute('data-comment-id');
//   const emoji = event.target.getAttribute('data-emoji');

//   fetch(`/react/${commentId}`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ emoji })
//   })
//   .then(response => response.json())
//   .then(data => {
//     if (data.success) {
//       // Mettez à jour le compteur de réaction sans recharger la page (optionnel)
//       const countElement = event.target.querySelector('span');
//       if (countElement) {
//         countElement.textContent = parseInt(countElement.textContent) + 1;
//       }
//     } else {
//       console.error('Erreur lors de la mise à jour de la réaction.');
//     }
//   })
//   .catch(error => {
//     console.error('Erreur réseau:', error);
//   });
// }

function reactToComment(event) {
  const commentId = event.target.getAttribute('data-comment-id');
  const emoji = event.target.getAttribute('data-emoji');

  fetch(`/react/${commentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Recharger la page pour afficher les réactions mises à jour
      window.location.reload();
    } else {
      console.error('Erreur lors de la mise à jour de la réaction.');
    }
  })
  .catch(error => {
    console.error('Erreur réseau:', error);
  });
}
