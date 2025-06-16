const uploadInput = document.getElementById('uploadInput');
const cameraInput = document.getElementById('cameraInput');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const preview = document.getElementById('imagePreview');
const form = document.getElementById('imageForm');
const loading = document.getElementById('loading');
const results = document.getElementById('resultsSection');

// API URL - UPDATE THIS WITH YOUR NGROK URL
const API_URL = 'https://eba2-104-196-143-37.ngrok-free.app'; // Replace this with your actual ngrok URL

// Theme toggle
const themeSwitch = document.getElementById('themeSwitch');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  document.body.classList.add('dark');
  if (themeSwitch) themeSwitch.checked = true;
}

if (themeSwitch) {
  themeSwitch.addEventListener('change', function () {
    if (this.checked) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
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

// Preview
function handlePreview(input) {
  const file = input.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please select an image smaller than 10MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  } else {
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
  }
}

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

// Form submission with fetch and localStorage history
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = uploadInput?.files[0] || cameraInput?.files[0];
    if (!file) {
      alert('Please upload an image or take a photo first.');
      return;
    }

    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true' // Skip ngrok browser warning
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (loading) loading.style.display = 'none';
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      if (results) results.style.display = 'block';

      const diseaseName = document.getElementById('diseaseName');
      const confidenceScore = document.getElementById('confidenceScore');
      const recommendation = document.getElementById('recommendation');

      if (diseaseName) diseaseName.textContent = data.predicted_class;
      if (confidenceScore) confidenceScore.textContent = data.confidence;
      if (recommendation) recommendation.innerHTML = data.recommendation;

      if (window.innerWidth < 768) {
        results.scrollIntoView({ behavior: 'smooth' });
      }

      // Save to history in localStorage
      const history = JSON.parse(localStorage.getItem('diagnosisHistory')) || [];

      history.unshift({
        date: new Date().toLocaleString(),
        image: preview.src,
        result: {
          disease: data.predicted_class,
          confidence: data.confidence,
          recommendation: data.recommendation,
        },
      });

      if (history.length > 10) history.pop(); // keep max 10 entries
      localStorage.setItem('diagnosisHistory', JSON.stringify(history));
      renderHistory();

    } catch (error) {
      console.error('Error:', error);
      alert(`Something went wrong: ${error.message}. Please check if the API is running and try again.`);
      if (loading) loading.style.display = 'none';
    }
  });
}

// History section functions
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
  const history = JSON.parse(localStorage.getItem('diagnosisHistory')) || [];
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

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
      <img src="${entry.image}" alt="Diagnosis ${index + 1}" style="max-width: 150px; border-radius: 8px;" />
      <p><strong>Disease:</strong> ${entry.result.disease}</p>
      <p><strong>Confidence:</strong> ${entry.result.confidence}</p>
      <div><strong>Recommendation:</strong> ${entry.result.recommendation}</div>
      <hr>
    `;
    historyList.appendChild(div);
  });
}