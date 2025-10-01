// Options page для Chrome Extension
// Сохраняет URL бэкенда в chrome.storage

document.addEventListener('DOMContentLoaded', async () => {
  const backendUrlInput = document.getElementById('backendUrl');
  const saveButton = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('status');

  // Загружаем сохранённые настройки
  const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
  backendUrlInput.value = backendUrl;

  // Обработчик сохранения
  saveButton.addEventListener('click', async () => {
    const url = backendUrlInput.value.trim();
    
    if (!url) {
      showStatus('Введите URL бэкенда', 'error');
      return;
    }

    try {
      // Проверяем что URL валидный
      new URL(url);
      
      // Сохраняем в chrome.storage
      await chrome.storage.sync.set({ backendUrl: url });
      showStatus('Настройки сохранены!', 'success');
      
    } catch (error) {
      showStatus('Неверный URL', 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Скрываем через 3 секунды
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
