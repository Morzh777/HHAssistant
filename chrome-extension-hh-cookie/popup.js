// Popup для Chrome Extension
// Позволяет отправить cookies вручную

document.addEventListener('DOMContentLoaded', async () => {
  const sendButton = document.getElementById('saveResume');
  const resetButton = document.getElementById('resetResume');
  const testButton = document.getElementById('testNotification');
  const coverLetterButton = document.getElementById('generateCoverLetter');
  const statusDiv = document.getElementById('status');

  // Получаем текущую вкладку
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Проверяем что мы на hh.ru
  let isOnHh = false;
  try {
    if (tab.url) {
      const url = new URL(tab.url);
      isOnHh = /\.hh\.ru$/i.test(url.hostname);
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
    isOnHh = false;
  }
  
  if (!isOnHh) {
    sendButton.textContent = "Перейти на hh.ru";
    sendButton.onclick = () => {
      chrome.tabs.update(tab.id, { url: "https://hh.ru" });
      window.close();
    };
    statusDiv.textContent = "Сначала зайдите на hh.ru";
    statusDiv.className = "status error";
    
    // Отключаем кнопку генерации сопроводительного письма
    coverLetterButton.disabled = true;
    coverLetterButton.textContent = "Нужна вакансия hh.ru";
    return;
  }

  // Проверяем что мы на странице резюме для сохранения резюме
  if (!tab.url.includes('/resume/') || !tab.url.includes('.hh.ru')) {
    sendButton.textContent = "Открыть резюме";
    sendButton.onclick = () => {
      chrome.tabs.update(tab.id, { url: "https://hh.ru/applicant/resumes" });
      window.close();
    };
    statusDiv.textContent = "Откройте страницу своего резюме";
    statusDiv.className = "status error";
    
    // Если мы на странице вакансии - разрешаем создание сопроводительного письма
    if (tab.url.includes('/vacancy/')) {
      coverLetterButton.disabled = false;
      coverLetterButton.textContent = "Создать сопроводительное письмо";
    } else {
      coverLetterButton.disabled = true;
      coverLetterButton.textContent = "Нужна страница вакансии";
    }
  }

  // Обработчик сохранения резюме
  sendButton.addEventListener('click', async () => {
    sendButton.disabled = true;
    sendButton.textContent = "Сохраняю...";
    statusDiv.textContent = "Сохраняю резюме на бэкенд...";
    statusDiv.className = "status";

    try {
      // Отправляем сообщение в background script
      const response = await chrome.runtime.sendMessage({action: 'saveResume'});
      
      if (response.success) {
        statusDiv.textContent = "✅ Резюме успешно сохранено и проанализировано!";
        statusDiv.className = "status success";
      } else {
        throw new Error(response.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error("Resume save failed:", error);
      statusDiv.textContent = `❌ Ошибка: ${error.message}`;
      statusDiv.className = "status error";
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Сохранить резюме";
    }
  });

  // Обработчик сброса резюме
  resetButton.addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите удалить все сохраненные файлы резюме? Это действие нельзя отменить.')) {
      return;
    }

    resetButton.disabled = true;
    resetButton.textContent = "Сбрасываю...";
    statusDiv.textContent = "Удаляю файлы резюме...";
    statusDiv.className = "status";

    try {
      // Отправляем сообщение в background script
      const response = await chrome.runtime.sendMessage({action: 'resetResume'});
      
      if (response.success) {
        statusDiv.textContent = "✅ Файлы резюме успешно удалены!";
        statusDiv.className = "status success";
      } else {
        throw new Error(response.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error("Resume reset failed:", error);
      statusDiv.textContent = `❌ Ошибка: ${error.message}`;
      statusDiv.className = "status error";
    } finally {
      resetButton.disabled = false;
      resetButton.textContent = "Сбросить резюме";
    }
  });

  // Обработчик генерации сопроводительного письма (работает на любой странице)
  coverLetterButton.addEventListener('click', async () => {
    coverLetterButton.disabled = true;
    coverLetterButton.textContent = "Проверяю...";
    statusDiv.textContent = "Проверяю существующие письма...";
    statusDiv.className = "status";

    try {
      // Сначала получаем ID вакансии с текущей страницы
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab.url || !currentTab.url.includes('hh.ru/vacancy/')) {
        throw new Error('Откройте страницу вакансии на hh.ru');
      }

      // Извлекаем ID вакансии из URL
      const urlMatch = currentTab.url.match(/\/vacancy\/(\d+)/);
      if (!urlMatch) {
        throw new Error('Не удалось определить ID вакансии');
      }
      
      const vacancyId = urlMatch[1];
      console.log('Found vacancy ID:', vacancyId);

      // Проверяем есть ли уже письмо для этой вакансии
      const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
      
      try {
        const response = await fetch(`${backendUrl}/cover-letter/${vacancyId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.content) {
            // Письмо уже существует - показываем его
            statusDiv.textContent = "✅ Найдено существующее письмо!";
            statusDiv.className = "status success";
            
            await displayCoverLetter(vacancyId);
            return;
          } else {
            // Письмо не найдено - переходим к генерации
            console.log('Letter not found, will generate new one:', data.error);
          }
        }
      } catch (error) {
        console.log('Error checking existing letter, will generate new one:', error);
      }

      // Письма нет - генерируем новое
      coverLetterButton.textContent = "Генерирую...";
      statusDiv.textContent = "Генерирую новое письмо...";
      
      const response = await chrome.runtime.sendMessage({action: 'generateCoverLetter'});
      console.log('Response from background:', response);
      
      if (response.success) {
        statusDiv.textContent = "✅ Сопроводительное письмо сгенерировано и сохранено!";
        statusDiv.className = "status success";
        
        // Получаем письмо по ID вакансии и отображаем в popup
        await displayCoverLetter(response.vacancyId);
        
      } else {
        throw new Error(response.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error("Cover letter generation failed:", error);
      statusDiv.textContent = `❌ Ошибка: ${error.message}`;
      statusDiv.className = "status error";
    } finally {
      coverLetterButton.disabled = false;
      coverLetterButton.textContent = "Создать сопроводительное письмо";
    }
  });

  // Обработчик тестирования уведомлений
  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    testButton.textContent = "Тестирую...";
    statusDiv.textContent = "Отправляю тестовое уведомление...";
    statusDiv.className = "status";

    try {
      const response = await chrome.runtime.sendMessage({action: 'testNotification'});
      if (response.success) {
        statusDiv.textContent = "✅ Тестовое уведомление отправлено!";
        statusDiv.className = "status success";
      } else {
        throw new Error(response.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error("Test notification failed:", error);
      statusDiv.textContent = `❌ Ошибка: ${error.message}`;
      statusDiv.className = "status error";
    } finally {
      testButton.disabled = false;
      testButton.textContent = "Тест уведомлений";
    }
  });

  // Функция для отображения письма в popup
  async function displayCoverLetter(vacancyId) {
    try {
      const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
      
      const response = await fetch(`${backendUrl}/cover-letter/${vacancyId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.content) {
        const container = document.getElementById('coverLetterContainer');
        const content = document.getElementById('coverLetterContent');
        
        content.textContent = data.content;
        container.style.display = 'block';
        
        // Добавляем обработчики для кнопок
        document.getElementById('copyCoverLetter').onclick = () => {
          navigator.clipboard.writeText(data.content).then(() => {
            alert('Письмо скопировано!');
          });
        };
        
        document.getElementById('closeCoverLetter').onclick = () => {
          container.style.display = 'none';
        };
        
      } else {
        throw new Error(data.error || 'Неверный формат данных');
      }
    } catch (error) {
      console.error('Error loading cover letter:', error);
      statusDiv.textContent = `❌ Ошибка загрузки письма: ${error.message}`;
      statusDiv.className = "status error";
    }
  }
});
