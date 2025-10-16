// Service Worker для Chrome Extension MV3
// Собирает cookies с hh.ru и отправляет на бэкенд
// Автоматически сохраняет информацию о вакансиях

// Функция для извлечения ID вакансии из URL
function extractVacancyId(url) {
  const match = url.match(/\/vacancy\/(\d+)/);
  return match ? match[1] : null;
}

// Функция для получения информации о вакансии через HH API
async function fetchVacancyInfo(vacancyId) {
  try {
    const response = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching vacancy info:', error);
  }
  return null;
}

// Функция для получения данных резюме с бэкенда
async function fetchResumeData() {
  try {
    const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
    const response = await fetch(`${backendUrl}/resume/latest`);
    
    if (response.ok) {
      const result = await response.json();
      return result.data; // Возвращаем только данные резюме
    } else {
      console.error('Failed to fetch resume data:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching resume data:', error);
    return null;
  }
}

// Функция для отправки данных в ChatGPT для генерации сопроводительного письма
async function generateCoverLetter(resumeData, vacancyData) {
  try {
    const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
    
    // Отправляем полные данные - теперь лимит увеличен до 10MB
    const payload = {
      resume: resumeData,
      vacancy: vacancyData
    };
    
    console.log('Sending data to ChatGPT for cover letter generation...');
    const response = await fetch(`${backendUrl}/ai/generate-cover-letter`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Cover letter generated successfully');
      return result;
    } else {
      const errorText = await response.text();
      console.error('ChatGPT API error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw error;
  }
}

// Функция для отправки вакансии на бэкенд
async function saveVacancyToBackend(vacancyData) {
  try {
    // Получаем настройки бэкенда
    const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
    console.log('Backend URL:', backendUrl);
    
    const response = await fetch(`${backendUrl}/vacancy-storage/save`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(vacancyData)
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Vacancy saved to backend:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error saving vacancy to backend:', error);
    return false;
  }
}

// Слушаем изменения вкладок для автоматического сохранения вакансий
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    const vacancyId = extractVacancyId(tab.url);
    if (vacancyId) {
      console.log(`Detected vacancy page: ${vacancyId}`);
      
      // Получаем информацию о вакансии
      console.log('Fetching vacancy info from HH API...');
      const vacancyData = await fetchVacancyInfo(vacancyId);
      if (vacancyData) {
        console.log('Vacancy data received:', vacancyData.name);
        // Добавляем метаданные
        vacancyData._metadata = {
          scrapedAt: new Date().toISOString(),
          sourceUrl: tab.url,
          extensionVersion: chrome.runtime.getManifest().version
        };
        
        // Сохраняем на бэкенд
        console.log('Saving vacancy to backend:', vacancyData.name);
        const saved = await saveVacancyToBackend(vacancyData);
        if (saved) {
          console.log('Vacancy saved successfully, showing notification');
          try {
            await chrome.notifications.create({
              type: "basic",
              iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
              title: "HH Vacancy Saver",
              message: `Вакансия "${vacancyData.name}" сохранена на бэкенд`
            });
            console.log('Notification created successfully');
          } catch (notificationError) {
            console.error('Failed to create notification:', notificationError);
          }
        } else {
          console.log('Failed to save vacancy to backend');
        }
      } else {
        console.log('Failed to fetch vacancy data from HH API');
      }
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Проверяем что мы на hh.ru
    const url = new URL(tab.url || "");
    if (!/\.hh\.ru$/i.test(url.hostname)) {
      // Если не на hh.ru, переходим туда
      await chrome.tabs.update(tab.id, { url: "https://hh.ru" });
      return;
    }

    // Получаем настройки бэкенда
    const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");

    // Собираем все cookies с домена hh.ru
    const cookies = await chrome.cookies.getAll({ domain: "hh.ru" });
    
    if (cookies.length === 0) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        title: "HH Cookie Collector",
        message: "Не найдено cookies для hh.ru. Убедитесь что вы авторизованы."
      });
      return;
    }

    // Формируем Cookie заголовок
    const cookieHeader = cookies
      .map(c => `${c.name}=${c.value}`)
      .join("; ");

    // Отправляем на бэкенд
    const response = await fetch(`${backendUrl}/auth/hh/cookies`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ cookie: cookieHeader })
    });

    if (response.ok) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        title: "HH Cookie Collector",
        message: `Успешно отправлено ${cookies.length} cookies на бэкенд`
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

  } catch (error) {
    console.error("Cookie send failed:", error);
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      title: "HH Cookie Collector",
      message: `Ошибка: ${error.message}`
    });
  }
});

// Показываем уведомление при установке
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      title: "HH Cookie Collector",
      message: "Расширение установлено! Зайдите на hh.ru и нажмите на иконку."
    });
    console.log('Installation notification created successfully');
  } catch (error) {
    console.error('Failed to create installation notification:', error);
  }
});

// Добавляем обработчик для тестирования уведомлений, сохранения резюме и генерации сопроводительного письма
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testNotification') {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      title: "Test Notification",
      message: "Это тестовое уведомление для проверки работы расширения"
    }).then(() => {
      sendResponse({success: true});
    }).catch((error) => {
      console.error('Test notification failed:', error);
      sendResponse({success: false, error: error.message});
    });
    return true; // Указываем что ответ будет асинхронным
  }
  
  if (request.action === 'saveResume') {
    (async () => {
      try {
        // Получаем текущую вкладку
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url || !tab.url.includes('/resume/') || !tab.url.includes('.hh.ru')) {
          sendResponse({success: false, error: 'Откройте страницу своего резюме на hh.ru'});
          return;
        }
        
        // Собираем cookies
        const cookies = await chrome.cookies.getAll({ domain: "hh.ru" });
        
        if (cookies.length === 0) {
          sendResponse({success: false, error: 'Не найдено cookies для hh.ru. Убедитесь что вы авторизованы.'});
          return;
        }
        
        // Формируем Cookie заголовок
        const cookieHeader = cookies
          .map(c => `${c.name}=${c.value}`)
          .join("; ");
        
        // Получаем настройки бэкенда
        const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
        
        // Отправляем cookies и URL резюме на бэкенд
        const response = await fetch(`${backendUrl}/resume/save-resume`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            cookie: cookieHeader,
            resumeUrl: tab.url
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          sendResponse({success: true, message: result.message});
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
      } catch (error) {
        console.error('Error saving resume:', error);
        sendResponse({success: false, error: error.message});
      }
    })();
    return true; // Указываем что ответ будет асинхронным
  }
  
  if (request.action === 'resetResume') {
    (async () => {
      try {
        // Получаем настройки бэкенда
        const { backendUrl = "http://localhost:3000" } = await chrome.storage.sync.get("backendUrl");
        
        // Отправляем запрос на сброс резюме
        const response = await fetch(`${backendUrl}/auth/hh/reset-resume`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          sendResponse({success: true, message: result.message});
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
      } catch (error) {
        console.error('Error resetting resume:', error);
        sendResponse({success: false, error: error.message});
      }
    })();
    return true; // Указываем что ответ будет асинхронным
  }
  
  if (request.action === 'generateCoverLetter') {
    (async () => {
      try {
        // Получаем текущую вкладку
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const vacancyId = extractVacancyId(tab.url);
        
        if (!vacancyId) {
          sendResponse({success: false, error: 'Не найдена вакансия на текущей странице'});
          return;
        }
        
        // Получаем данные резюме и вакансии
        console.log('Fetching resume and vacancy data...');
        const [resumeData, vacancyData] = await Promise.all([
          fetchResumeData(),
          fetchVacancyInfo(vacancyId)
        ]);
        
        if (!resumeData) {
          sendResponse({success: false, error: 'Не удалось получить данные резюме'});
          return;
        }
        
        if (!vacancyData) {
          sendResponse({success: false, error: 'Не удалось получить данные вакансии'});
          return;
        }
        
        // Генерируем сопроводительное письмо
        const coverLetter = await generateCoverLetter(resumeData, vacancyData);
        sendResponse({
          success: true, 
          coverLetter: coverLetter,
          vacancyId: vacancyData.id,
          vacancyName: vacancyData.name
        });
        
      } catch (error) {
        console.error('Error generating cover letter:', error);
        sendResponse({success: false, error: error.message});
      }
    })();
    return true; // Указываем что ответ будет асинхронным
  }
});
