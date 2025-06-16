const uploadInput = document.getElementById('uploadInput');
const cameraInput = document.getElementById('cameraInput');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const preview = document.getElementById('imagePreview');
const form = document.getElementById('imageForm');
const loading = document.getElementById('loading');
const results = document.getElementById('resultsSection');

// API URL - UPDATE THIS WITH YOUR NGROK URL
const API_URL = 'https://f796-35-233-221-6.ngrok-free.app'; // Replace this with your actual ngrok URL

// Theme toggle with fallback for environments without localStorage
const themeSwitch = document.getElementById('themeSwitch');
let currentTheme = 'light';
try {
  currentTheme = localStorage.getItem('theme') || 'light';
} catch (e) {
  console.warn('localStorage not available, using default theme');
}

if (currentTheme === 'dark') {
  document.body.classList.add('dark');
  if (themeSwitch) themeSwitch.checked = true;
}

if (themeSwitch) {
  themeSwitch.addEventListener('change', function () {
    if (this.checked) {
      document.body.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {
        console.warn('Cannot save theme preference');
      }
    } else {
      document.body.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {
        console.warn('Cannot save theme preference');
      }
    }
  });
}

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('show');
  });

  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('show');
    }
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('show');
    }
  });
}

// Preview function with better error handling
function handlePreview(input) {
  if (!input || !input.files || input.files.length === 0) {
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
    return;
  }

  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
  };
  reader.onerror = (e) => {
    console.error('FileReader error:', e);
    alert('Error reading file. Please try again.');
  };
  reader.readAsDataURL(file);
}

// Event listeners with null checks
if (uploadInput) {
  uploadInput.addEventListener('change', () => {
    handlePreview(uploadInput);
    if (cameraInput) cameraInput.value = '';
  });
}

if (takePhotoBtn && cameraInput) {
  takePhotoBtn.addEventListener('click', () => {
    cameraInput.click();
  });
}

if (cameraInput) {
  cameraInput.addEventListener('change', () => {
    handlePreview(cameraInput);
    if (uploadInput) uploadInput.value = '';
  });
}

// Form submission with better error handling
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = uploadInput?.files[0] || cameraInput?.files[0];
    if (!file) {
      alert('Please upload an image or take a photo first.');
      return;
    }

    // Show loading state
    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      // Hide loading state
      if (loading) loading.style.display = 'none';
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Show results
      if (results) results.style.display = 'block';

      const diseaseName = document.getElementById('predicted_class');
      const confidenceScore = document.getElementById('confidence');
      const recommendation = document.getElementById('recommendation');

      if (diseaseName) diseaseName.textContent = data.predicted_class || 'Unknown';
      if (confidenceScore) confidenceScore.textContent = data.confidence || 'N/A';
      if (recommendation) recommendation.innerHTML = data.recommendation || 'No recommendation available.';

      // Scroll to results on mobile
      if (window.innerWidth < 768) {
        results.scrollIntoView({ behavior: 'smooth' });
      }

      // Save to history with localStorage fallback
      try {
        saveToHistory(data, preview.src);
      } catch (e) {
        console.warn('Cannot save to history:', e);
      }

    } catch (error) {
      console.error('Error:', error);
      
      // More specific error messages
      let errorMessage = 'Something went wrong. ';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Cannot connect to the server. Please check if the API is running.';
      } else if (error.message.includes('404')) {
        errorMessage += 'API endpoint not found. Please check the URL.';
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error. Please try again later.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      if (loading) loading.style.display = 'none';
    }
  });
}

// History functions with localStorage fallback
function saveToHistory(data, imageSrc) {
  try {
    const history = JSON.parse(localStorage.getItem('diagnosisHistory')) || [];

    history.unshift({
      date: new Date().toLocaleString(),
      image: imageSrc,
      result: {
        disease: data.predicted_class,
        confidence: data.confidence,
        recommendation: data.recommendation,
      },
    });

    if (history.length > 10) history.pop(); // keep max 10 entries
    localStorage.setItem('diagnosisHistory', JSON.stringify(history));
    renderHistory();
  } catch (e) {
    console.warn('Cannot save to localStorage:', e);
  }
}

function toggleHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  if (historyList.style.display === 'none' || historyList.style.display === '') {
    renderHistory();
    historyList.style.display = 'block';
  } else {
    historyList.style.display = 'none';
  }
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('diagnosisHistory')) || [];
  } catch (e) {
    console.warn('Cannot read from localStorage:', e);
  }

  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<p>No previous diagnoses found.</p>';
    return;
  }

  history.forEach((entry, index) => {
    const div = document.createElement('div');
    div.className = 'history-entry';
    div.innerHTML = `
      <p><strong>Date:</strong> ${entry.date}</p>
      <img src="${entry.image}" alt="Diagnosis ${index + 1}" style="max-width: 150px; border-radius: 8px;" onerror="this.style.display='none'" />
      <p><strong>Disease:</strong> ${entry.result.disease}</p>
      <p><strong>Confidence:</strong> ${entry.result.confidence}</p>
      <div><strong>Recommendation:</strong> ${entry.result.recommendation}</div>
      <hr>
    `;
    historyList.appendChild(div);
  });
}