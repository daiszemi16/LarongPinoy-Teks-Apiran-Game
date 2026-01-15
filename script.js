/* ===================== GAME VARIABLES ===================== */
let p1Score = 0;
let p2Score = 0;
let tossCount = 0;
let roundHistory = [];
let gameStats = {
  totalGames: 0,
  p1TotalWins: 0,
  p2TotalWins: 0,
  currentStreak: 0,
  streakHolder: ''
};

// Store game setup
let gameSetup = {
  p1Name: '',
  p2Name: '',
  p1Icon: '',
  p2Icon: '',
  p1Card: '',
  p2Card: '',
  cardBack: ''
};

// Store uploaded images
let uploadedImages = {
  p1Icon: null,
  p2Icon: null,
  p1Card: null,
  p2Card: null,
  cardBack: null
};

// Game state
let isGameActive = false;
let isTossing = false;

/* ===================== HELPER FUNCTIONS ===================== */
function getImageUrl(type, defaultValue) {
  const uploaded = uploadedImages[type];
  if (uploaded) {
    return uploaded;
  }
  return defaultValue.startsWith('data:') ? defaultValue : `./${defaultValue}`;
}

function getCardBackUrl() {
  return getImageUrl('cardBack', document.getElementById('back-select').value);
}

/* ===================== SOUND FUNCTIONS ===================== */
function playSound(type) {
  const sound = document.getElementById(type + 'Sound');
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Audio play failed:', e));
  }
}

/* ===================== CONFETTI EFFECT ===================== */
function createConfetti() {
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = ['#FF69B4', '#FFD700', '#87CEEB', '#98FB98', '#DDA0DD'][Math.floor(Math.random() * 5)];
      confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

/* ===================== FILE UPLOAD HANDLERS ===================== */
function setupFileUpload(inputId, previewId, statusId, uploadKey) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const status = document.getElementById(statusId);
  const label = document.querySelector(`label[for="${inputId}"]`);
  const container = input.closest('.upload-container');

  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        uploadedImages[uploadKey] = event.target.result;

        // Update button style
        label.classList.add('uploaded');
        label.innerHTML = '<i class="fas fa-check-circle"></i> Image Uploaded';

        // Show preview
        preview.classList.add('show');
        preview.innerHTML = `
          <img src="${event.target.result}" class="preview-image" alt="Preview">
          <button class="remove-preview" onclick="removeUpload('${inputId}', '${previewId}', '${statusId}', '${uploadKey}')">×</button>
        `;

        // Show status
        if (status) {
          status.innerHTML = '<i class="fas fa-check-circle"></i> This image will be used in game';
          status.classList.add('active');
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Add drag and drop functionality
  setupDragAndDrop(container, inputId, previewId, statusId, uploadKey);
}

function setupDragAndDrop(container, inputId, previewId, statusId, uploadKey) {
  const preview = document.getElementById(previewId);
  const status = document.getElementById(statusId);
  const label = document.querySelector(`label[for="${inputId}"]`);

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    container.classList.add('drag-over');
  }

  function unhighlight(e) {
    container.classList.remove('drag-over');
  }

  // Handle drop
  container.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    let url = '';

    // First, check if files were dropped
    if (dt.files && dt.files.length > 0) {
      const file = dt.files[0];
      if (file && file.type.startsWith('image/')) {
        // Simulate file input change
        const input = document.getElementById(inputId);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;

        // Trigger the change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
      return;
    }

    // Try to get URL from different sources (for backward compatibility)
    if (dt.getData('text/uri-list')) {
      url = dt.getData('text/uri-list').split('\n')[0];
    } else if (dt.getData('text/html')) {
      // Extract image URL from HTML
      const html = dt.getData('text/html');
      const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch) {
        url = imgMatch[1];
      }
    } else if (dt.getData('text/plain')) {
      url = dt.getData('text/plain');
    }

    if (url) {
      loadImageFromUrl(url, inputId, previewId, statusId, uploadKey);
    }
  }
}

function loadImageFromUrl(url, inputId, previewId, statusId, uploadKey) {
  const preview = document.getElementById(previewId);
  const status = document.getElementById(statusId);
  const label = document.querySelector(`label[for="${inputId}"]`);

  // Create a temporary image to test loading
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = function() {
    // Convert to canvas to get data URL (handles CORS)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      uploadedImages[uploadKey] = dataUrl;

      // Update button style
      label.classList.add('uploaded');
      label.innerHTML = '<i class="fas fa-check-circle"></i> Image Uploaded';

      // Show preview
      preview.classList.add('show');
      preview.innerHTML = `
        <img src="${dataUrl}" class="preview-image" alt="Preview">
        <button class="remove-preview" onclick="removeUpload('${inputId}', '${previewId}', '${statusId}', '${uploadKey}')">×</button>
      `;

      // Show status
      if (status) {
        status.innerHTML = '<i class="fas fa-check-circle"></i> This image will be used in game';
        status.classList.add('active');
      }
    } catch (e) {
      showError('Unable to load image due to CORS restrictions');
    }
  };

  img.onerror = function() {
    showError('Failed to load image from URL');
  };

  function showError(message) {
    if (status) {
      status.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
      status.classList.add('active', 'error');
      setTimeout(() => {
        status.classList.remove('active', 'error');
      }, 3000);
    }
  }

  img.src = url;
}

function removeUpload(inputId, previewId, statusId, uploadKey) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const status = document.getElementById(statusId);
  const label = document.querySelector(`label[for="${inputId}"]`);
 
  // Clear the file input
  input.value = '';
 
  // Reset stored image
  uploadedImages[uploadKey] = null;
 
  // Reset button style
  label.classList.remove('uploaded');
  label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Custom Image';
 
  // Hide preview
  preview.classList.remove('show');
  preview.innerHTML = '';

  // Hide status
  if (status) {
    status.innerHTML = '';
    status.classList.remove('active');
  }
}

/* ===================== SCREEN NAVIGATION ===================== */
function showMenu() {
  document.getElementById("intro-screen").style.display = "none";
  document.getElementById("menu-screen").style.display = "flex";
}

function showSetupPage() {
  document.getElementById("menu-screen").style.display = "none";
  document.getElementById("setup-page").style.display = "block";
}

function backToMenuFromSetup() {
  document.getElementById("setup-page").style.display = "none";
  document.getElementById("menu-screen").style.display = "flex";
}

function backToFront() {
  document.getElementById("menu-screen").style.display = "none";
  document.getElementById("intro-screen").style.display = "flex";

  // Close any open popups
  closeMechanics();
  closeHistory();
  closeStats();
  closeDevelopers();
  closeSoundTip();
}

function proceedToGameplay() {
  // Save setup configuration
  gameSetup.p1Name = document.getElementById('p1-name').value || 'Player 1';
  gameSetup.p2Name = document.getElementById('p2-name').value || 'Player 2';
  gameSetup.p1Icon = uploadedImages.p1Icon || document.getElementById('p1-icon').value;
  gameSetup.p2Icon = uploadedImages.p2Icon || document.getElementById('p2-icon').value;
  gameSetup.p1Card = uploadedImages.p1Card || document.getElementById('p1-select').value;
  gameSetup.p2Card = uploadedImages.p2Card || document.getElementById('p2-select').value;
  gameSetup.cardBack = uploadedImages.cardBack || document.getElementById('back-select').value;

  // Switch to gameplay page
  document.getElementById("setup-page").style.display = "none";
  document.getElementById("gameplay-page").style.display = "block";

  // Initialize game with saved setup
  initializeGame();
}

function backToSetup() {
  if (isGameActive && !confirm("Are you sure you want to return to setup? Current game progress will be lost.")) {
    return;
  }
  
  document.getElementById("gameplay-page").style.display = "none";
  document.getElementById("setup-page").style.display = "block";
  
  // Reset game state
  resetGameState();
}

function exitGame() {
  if (confirm("Are you sure you want to exit the game?")) {
    window.close();
    if (!window.closed) {
      window.location.href = 'about:blank';
    }
  }
}

/* =============== POPUP FUNCTIONS =============== */
function showMechanics() {
  document.getElementById("mechanicsBox").style.display = "flex";
}

function closeMechanics() {
  document.getElementById("mechanicsBox").style.display = "none";
}

function showHistory() {
  document.getElementById("historyBox").style.display = "flex";
}

function closeHistory() {
  document.getElementById("historyBox").style.display = "none";
}

function showStats() {
  document.getElementById("totalGames").textContent = gameStats.totalGames;
  document.getElementById("p1TotalWins").textContent = gameStats.p1TotalWins;
  document.getElementById("p2TotalWins").textContent = gameStats.p2TotalWins;
  document.getElementById("currentStreak").textContent = gameStats.currentStreak +
    (gameStats.streakHolder ? ` (${gameStats.streakHolder})` : '');
  document.getElementById("statsBox").style.display = "flex";
}

function closeStats() {
  document.getElementById("statsBox").style.display = "none";
}

function showDevelopers() {
  document.getElementById("developersBox").style.display = "flex";
}

function closeDevelopers() {
  document.getElementById("developersBox").style.display = "none";
}


function showBackToSetupConfirmation() {
  // Update current game stats in the dialog
  document.getElementById('currentScores').textContent = 
    `${gameSetup.p1Name}: ${p1Score} | ${gameSetup.p2Name}: ${p2Score}`;
  document.getElementById('currentRound').textContent = 
    `Round ${tossCount}/5`;
  
  document.getElementById("backToSetupBox").style.display = "flex";
}

// Add new function for confirmed action
function confirmBackToSetup() {
  closeBackToSetupConfirmation();
  
  // Hide gameplay page
  document.getElementById("gameplay-page").style.display = "none";
  
  // Show setup page
  document.getElementById("setup-page").style.display = "block";
  
  // Reset game progress
  resetGameState();
}


function closeBackToSetupConfirmation() {
  document.getElementById("backToSetupBox").style.display = "none";
}


function backToSetup() {
  // Hide the confirmation popup
  closeBackToSetupConfirmation();

  // Hide gameplay page
  document.getElementById("gameplay-page").style.display = "none";

  // Show setup page
  document.getElementById("setup-page").style.display = "block";

  // Reset game progress
  resetGameState();
}

function showSoundTip() {
  document.getElementById("soundTipBox").style.display = "flex";
}

function closeSoundTip() {
  document.getElementById("soundTipBox").style.display = "none";
}

/* ===================== GAME INITIALIZATION ===================== */
function initializeGame() {
  // Reset scores
  p1Score = 0;
  p2Score = 0;
  tossCount = 0;
  roundHistory = [];
  isGameActive = true;
  
  // Clear history
  document.getElementById('historyLog').innerHTML = '';
  
  // Update displays
  document.getElementById('p1-display').textContent = gameSetup.p1Name;
  document.getElementById('p2-display').textContent = gameSetup.p2Name;
  updateScoreboard();
  updateProgressBar();

  // Apply images to game elements
  const p1Hand = document.getElementById('p1-hand');
  const p2Hand = document.getElementById('p2-hand');
  const card1 = document.getElementById('card1');
  const card2 = document.getElementById('card2');

  // Set player icons
  p1Hand.style.backgroundImage = `url(${getImageUrl('p1Icon', gameSetup.p1Icon)})`;
  p2Hand.style.backgroundImage = `url(${getImageUrl('p2Icon', gameSetup.p2Icon)})`;

  // Set card faces
  card1.querySelector('.front').style.backgroundImage = `url(${getImageUrl('p1Card', gameSetup.p1Card)})`;
  card2.querySelector('.front').style.backgroundImage = `url(${getImageUrl('p2Card', gameSetup.p2Card)})`;

  // Set card backs
  const cardBackUrl = getImageUrl('cardBack', gameSetup.cardBack);
  card1.querySelector('.back').style.backgroundImage = `url(${cardBackUrl})`;
  card2.querySelector('.back').style.backgroundImage = `url(${cardBackUrl})`;

  // Reset animations
  resetCardAnimations();

  // Enable toss button
  document.getElementById('tossBtn').disabled = false;
}

function resetCardAnimations() {
  const result = document.getElementById('resultText');
  const c1 = document.getElementById('card1');
  const c2 = document.getElementById('card2');
  const p1 = document.getElementById('p1-hand');
  const p2 = document.getElementById('p2-hand');

  result.classList.remove('show');
  c1.classList.remove('flip-front', 'flip-back');
  c2.classList.remove('flip-front', 'flip-back');
  p1.classList.remove('clap', 'winner-glow');
  p2.classList.remove('clap', 'winner-glow');
}

/* ===================== GAME LOGIC ===================== */
function manualToss() {
  if (isTossing) return;
  performToss();
}

function performToss() {
  if (!isGameActive || isTossing) return;
  
  isTossing = true;
  tossCount++;
  
  const p1 = document.getElementById('p1-hand');
  const p2 = document.getElementById('p2-hand');
  const c1 = document.getElementById('card1');
  const c2 = document.getElementById('card2');
  const result = document.getElementById('resultText');

  // Reset previous state
  result.classList.remove('show');
  c1.classList.remove('flip-front', 'flip-back');
  c2.classList.remove('flip-front', 'flip-back');
  p1.classList.remove('winner-glow');
  p2.classList.remove('winner-glow');

  // Start clap animation
  p1.classList.add('clap');
  p2.classList.add('clap');

  // Disable toss button
  document.getElementById('tossBtn').disabled = true;

  setTimeout(() => {
    playSound('toss');
    const side1 = Math.random() < 0.5 ? "front" : "back";
    const side2 = Math.random() < 0.5 ? "front" : "back";

    c1.classList.add(side1 === "front" ? "flip-front" : "flip-back");
    c2.classList.add(side2 === "front" ? "flip-front" : "flip-back");
  }, 500);

  setTimeout(() => {
    const p1Front = c1.classList.contains("flip-front");
    const p2Front = c2.classList.contains("flip-front");

    if (p1Front && !p2Front) {
      handleRoundWin(1, p1, result);
    } else if (!p1Front && p2Front) {
      handleRoundWin(2, p2, result);
    } else {
      handleDraw(result);
      return;
    }

    updateScoreboard();
    updateProgressBar();
    result.classList.add("show");

    // Check for game end
    if (p1Score >= 5 || p2Score >= 5) {
      setTimeout(() => endGame(), 2000);
    } else {
      setTimeout(() => {
        resetCardAnimations();
        document.getElementById('tossBtn').disabled = false;
        isTossing = false;
      }, 2000);
    }
  }, 2000);
}

function handleRoundWin(player, handElement, resultElement) {
  const winnerName = player === 1 ? gameSetup.p1Name : gameSetup.p2Name;
  
  if (player === 1) {
    p1Score++;
  } else {
    p2Score++;
  }
  
  handElement.classList.add('winner-glow');
  resultElement.innerHTML = `${winnerName} Wins this round! <i class='fas fa-trophy'></i>`;
  playSound('win');
  addRoundHistory(`Round ${tossCount}: ${winnerName} wins!`);
  updateStreak(winnerName);
}

function handleDraw(resultElement) {
  resultElement.innerHTML = "Draw — Toss Again! <i class='fas fa-redo'></i>";
  addRoundHistory(`Round ${tossCount}: Draw - retossing`);
  resultElement.classList.add("show");
  
  setTimeout(() => {
    resetCardAnimations();
    tossCount--;
    isTossing = false;
    document.getElementById('tossBtn').disabled = false;
  }, 1500);
}

function endGame() {
  isGameActive = false;
  isTossing = false;
  
  let winner = '';
  let finalMessage = '';
  
  if (p1Score > p2Score) {
    winner = gameSetup.p1Name;
    finalMessage = `${gameSetup.p1Name} wins with ${p1Score} points!`;
    gameStats.p1TotalWins++;
  } else if (p2Score > p1Score) {
    winner = gameSetup.p2Name;
    finalMessage = `${gameSetup.p2Name} wins with ${p2Score} points!`;
    gameStats.p2TotalWins++;
  } else {
    finalMessage = `It's a tie! Both players scored ${p1Score} points!`;
  }
  
  gameStats.totalGames++;
  
  const result = document.getElementById('resultText');
  result.innerHTML = `<i class='fas fa-trophy'></i> ${winner ? winner + ' Wins!' : "It's a Tie!"} <i class='fas fa-trophy'></i>`;
  result.classList.add("show");
  createConfetti();
  playSound('win');
  
  setTimeout(() => {
    showGameEndScreen(finalMessage);
  }, 2000);
}

/* ===================== UI UPDATE FUNCTIONS ===================== */
function updateScoreboard() {
  document.getElementById('scoreboard').textContent =
    `${gameSetup.p1Name}: ${p1Score} | ${gameSetup.p2Name}: ${p2Score} | Wins: ${tossCount}/5`;
}

function updateProgressBar() {
  const progress = (tossCount / 5) * 100;
  document.getElementById('progressBar').style.width = progress + '%';
}

function addRoundHistory(text) {
  roundHistory.push(text);
  const historyLog = document.getElementById('historyLog');
  const item = document.createElement('div');
  item.className = 'round-item';
  item.textContent = text;
  historyLog.appendChild(item);
  historyLog.scrollTop = historyLog.scrollHeight;
}

function updateStreak(winner) {
  if (gameStats.streakHolder === winner) {
    gameStats.currentStreak++;
  } else {
    gameStats.currentStreak = 1;
    gameStats.streakHolder = winner;
  }
}

/* ===================== GAME END ACTIONS ===================== */
function showGameEndScreen(message) {
  document.getElementById('finalResultText').textContent = message;
  document.getElementById('gameEndOverlay').style.display = 'flex';
}

function continueGame() {
  // Continue with same setup, reset scores
  document.getElementById('gameEndOverlay').style.display = 'none';
  resetGameState();
  initializeGame();
}

function resetGameplay() {
  // Reset game but keep same setup
  document.getElementById('gameEndOverlay').style.display = 'none';
  resetGameState();
  initializeGame();
}

function createNewGame() {
  // Return to setup page for new configuration
  document.getElementById('gameEndOverlay').style.display = 'none';
  document.getElementById("gameplay-page").style.display = "none";
  document.getElementById("setup-page").style.display = "block";
  resetGameState();
}

function returnToMenu() {
  document.getElementById('gameEndOverlay').style.display = 'none';
  document.getElementById("gameplay-page").style.display = "none";
  document.getElementById("menu-screen").style.display = "flex";
  resetGameState();
}

function resetGameState() {
  p1Score = 0;
  p2Score = 0;
  tossCount = 0;
  roundHistory = [];
  isGameActive = false;
  isTossing = false;
  document.getElementById('historyLog').innerHTML = '';
  resetCardAnimations();
}

/* ===================== KEYBOARD CONTROLS ===================== */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const mechanicsBox = document.getElementById('mechanicsBox');
    const historyBox = document.getElementById('historyBox');
    const statsBox = document.getElementById('statsBox');
    const soundTipBox = document.getElementById('soundTipBox');
    const gameEndOverlay = document.getElementById('gameEndOverlay');

    if (mechanicsBox.style.display === 'flex') {
      closeMechanics();
    } else if (historyBox.style.display === 'flex') {
      closeHistory();
    } else if (statsBox.style.display === 'flex') {
      closeStats();
    } else if (soundTipBox.style.display === 'flex') {
      closeSoundTip();
    } else if (gameEndOverlay.style.display === 'flex') {
      // Don't close game end overlay with ESC
    }
  }
  
  // Spacebar to toss (when on gameplay page)
  if (e.key === ' ' && document.getElementById('gameplay-page').style.display === 'block') {
    e.preventDefault();
    if (!isTossing && isGameActive) {
      manualToss();
    }
  }
});

/* ===================== INITIALIZE ===================== */
document.addEventListener('DOMContentLoaded', function() {
  // Setup file upload handlers
  setupFileUpload('p1-upload', 'p1-preview', 'p1-icon-status', 'p1Icon');
  setupFileUpload('p2-upload', 'p2-preview', 'p2-icon-status', 'p2Icon');
  setupFileUpload('p1-card-upload', 'p1-card-preview', 'p1-card-status', 'p1Card');
  setupFileUpload('p2-card-upload', 'p2-card-preview', 'p2-card-status', 'p2Card');
  setupFileUpload('back-upload', 'back-preview', 'back-status', 'cardBack');

  // Add click event listener for info icon
  const infoIcon = document.querySelector('.info-icon');
  if (infoIcon) {
    infoIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      showSoundTip();
    });
  }
});
