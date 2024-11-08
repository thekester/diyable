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

        // Filtrage des cartes
        projectCards.forEach(card => {
          if (category === 'all') {
            card.style.display = 'block';
          } else if (category === 'autre') {
            const cardCategory = card.dataset.category;
            if (!cardCategory || ['autre', 'other'].includes(cardCategory.toLowerCase())) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          } else {
            if (card.dataset.category === category.toLowerCase()) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          }
        });
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
