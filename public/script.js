// script.js

// DOMContentLoaded pour s'assurer que le script s'exécute après le chargement de la page
document.addEventListener('DOMContentLoaded', function () {
  // Sélection des boutons de filtre
  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');
  const noProjectsMessage = document.getElementById('no-projects-message');

  // Vérifiez que les boutons existent avant de tenter d'accéder à leurs propriétés
  if (filterButtons && filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        const category = this.dataset.category;

        // Gestion de la classe active
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        // Compteur pour les projets visibles
        let projectsVisible = 0;

        // Vérifiez que les cartes existent également
        if (projectCards && projectCards.length > 0) {
          projectCards.forEach(card => {
            const cardCategory = card.dataset.category ? card.dataset.category.toLowerCase() : '';

            if (category === 'all') {
              card.style.display = 'block';
              projectsVisible++;
            } else if (category === 'autre') {
              if (!cardCategory || ['autre', 'other'].includes(cardCategory)) {
                card.style.display = 'block';
                projectsVisible++;
              } else {
                card.style.display = 'none';
              }
            } else {
              if (cardCategory === category.toLowerCase()) {
                card.style.display = 'block';
                projectsVisible++;
              } else {
                card.style.display = 'none';
              }
            }
          });
        }

        // Afficher ou cacher le message 'Aucun projet disponible pour cette catégorie.'
        if (projectsVisible === 0) {
          if (noProjectsMessage) {
            noProjectsMessage.style.display = 'block';
          }
        } else {
          if (noProjectsMessage) {
            noProjectsMessage.style.display = 'none';
          }
        }
      });
    });
  } else {
    console.warn("Aucun bouton de filtre trouvé sur la page.");
  }

  // Exemple d'effet de clic sur le bouton héro
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

  // Fonctionnalité du menu déroulant pour le nom d'utilisateur
  const usernameDropdown = document.getElementById('usernameDropdown');
  if (usernameDropdown) {
    usernameDropdown.addEventListener('click', toggleDropdown);
  }

  // Fermer le menu si l'utilisateur clique en dehors de celui-ci
  window.addEventListener('click', function(event) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu && usernameDropdown && !usernameDropdown.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.style.display = 'none'; // Cache le menu si on clique ailleurs
    }
  });

  // Affichage des commentaires des projets
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
        // Supposons que le serveur renvoie la liste mise à jour des commentaires
        const newComments = await response.json(); // Ajustez en fonction de la réponse du serveur
        const commentList = document.querySelector('.comment-list');
        commentList.innerHTML = ''; // Nettoie la liste des commentaires
        newComments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.classList.add('comment');
          commentDiv.innerHTML = `
            <div class="comment-header">
              <span class="comment-username">${comment.username}</span>
              <span class="comment-date">${new Date(comment.date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="comment-body">${comment.comment}</div>
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

// Fonction pour basculer l'affichage du menu déroulant
function toggleDropdown() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  // Vérifiez si le menu est actuellement visible
  if (dropdownMenu.style.display === 'flex' || dropdownMenu.style.display === 'block') {
    dropdownMenu.style.display = 'none'; // Cache le menu
  } else {
    dropdownMenu.style.display = 'flex'; // Affiche le menu
  }
}

// Fonction pour gérer les réactions aux commentaires
function reactToComment(commentId, reaction) {
  fetch('/comments/react', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ commentId, reaction })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Met à jour dynamiquement l'affichage des réactions
      const button = document.querySelector(`.reaction-button[data-id="${commentId}"][data-reaction="${reaction}"]`);
      if (button) {
        // Met à jour le compteur de réactions
        button.textContent = `${reaction} ${data.updatedCount}`;
      }
    } else {
      alert('Erreur lors de la mise à jour de la réaction.');
    }
  })
  .catch(error => {
    console.error('Erreur de réaction:', error);
  });
}
