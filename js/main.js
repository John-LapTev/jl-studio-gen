// --- START OF FILE jl-studio.art/gen-img-ref/js/main.js ---
import { fetchAvailableImageModels } from './api.js';
import { initUI, renderGallery, showNotification, initModelsModalListeners, initStylesModalListeners, initTrendsModalListeners, updateOptionButtonLabels, selectModel } from './ui.js';
import { initReferences, uploadedReferences as currentReferences } from './references.js'; // Импортируем currentReferences
import { initGenerator } from './generator.js';

// --- Глобальное состояние приложения ---
const appState = {
    // Данные, загружаемые из JSON
    imageModelsData: null, // Детали моделей из models.json
    stylesData: null,      // Данные стилей из styles.json
    trendsData: null,      // Данные трендов из trends.json
    config: {              // Общие конфигурации
        imageAnalysisModel: "openai-large", // Модель по умолчанию для анализа референсов
        textProcessingModel: "openai",      // Модель по умолчанию для обработки текста
    },

    // Добавляем новое свойство для состояния панели генератора
    isPanelExpanded: true, // По умолчанию панель развернута
    
    // Динамически загружаемые данные
    availableImageModelsFromAPI: [], // Модели, реально доступные через API

    // Пользовательские выборы и настройки
    selectedModel: 'flux', // ID текущей выбранной модели генерации
    selectedStyle: null,   // Объект выбранного стиля {id, name, prompt, image, defaultEnhance}
    selectedTrend: null,   // Объект выбранного тренда {id, name, description, image, prompt}
    selectedSize: { width: 1024, height: 1024 },
    generationCount: 1,
    currentSeedValue: '12345', // Начальное значение сида (строка)
    useRandomSeed: true,
    enhancePrompt: true,   // Улучшение промта через ИИ включено по умолчанию
    preserveSettings: {
        composition: true,
        face: true,
        colors: true
    },
    
    // Для управления промтом
    lastRawFinalPrompt: '', // Последний "сырой" промт после сборки и обработки API, до редактирования пользователем
    editedFinalPrompt: '',  // Промт, отредактированный пользователем в модалке

    // Для доступа к референсам из других модулей (хотя лучше через импорт currentReferences)
    get references() {
        return currentReferences;
    }
};

// --- История сгенерированных изображений ---
let generatedImageHistory = [];

/**
 * Загружает начальное состояние приложения из localStorage.
 */
function loadAppState() {
    try {
        const storedState = localStorage.getItem('jlStudioGenAppState');
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            // Осторожно обновляем appState, чтобы не перезаписать функции или важные структуры
            if (parsedState.selectedModel) appState.selectedModel = parsedState.selectedModel;
            if (parsedState.selectedSize) appState.selectedSize = parsedState.selectedSize;
            if (parsedState.generationCount) appState.generationCount = parsedState.generationCount;
            if (parsedState.currentSeedValue) appState.currentSeedValue = parsedState.currentSeedValue;
            if (typeof parsedState.useRandomSeed === 'boolean') appState.useRandomSeed = parsedState.useRandomSeed;
            if (typeof parsedState.enhancePrompt === 'boolean') appState.enhancePrompt = parsedState.enhancePrompt;
            if (parsedState.preserveSettings) appState.preserveSettings = { ...appState.preserveSettings, ...parsedState.preserveSettings };
            
            // Добавляем проверку для состояния панели
            if (typeof parsedState.isPanelExpanded === 'boolean') appState.isPanelExpanded = parsedState.isPanelExpanded;
        }
    } catch (e) {
        console.warn("Не удалось загрузить состояние приложения из localStorage:", e);
    }
}

/**
 * Сохраняет текущее состояние приложения в localStorage.
 */
function saveAppState() {
    try {
        const stateToSave = {
            selectedModel: appState.selectedModel,
            selectedSize: appState.selectedSize,
            generationCount: appState.generationCount,
            currentSeedValue: appState.currentSeedValue,
            useRandomSeed: appState.useRandomSeed,
            enhancePrompt: appState.enhancePrompt,
            preserveSettings: appState.preserveSettings,
            // Сохраняем ID стиля и тренда, чтобы восстановить объекты при загрузке
            selectedStyleId: appState.selectedStyle ? appState.selectedStyle.id : null,
            selectedTrendId: appState.selectedTrend ? appState.selectedTrend.id : null,
            // Добавляем сохранение состояния панели
            isPanelExpanded: appState.isPanelExpanded
        };
        localStorage.setItem('jlStudioGenAppState', JSON.stringify(stateToSave));
    } catch (e) {
        console.warn("Не удалось сохранить состояние приложения в localStorage:", e);
    }
}

/**
 * Загружает историю сгенерированных изображений из localStorage.
 */
function loadGeneratedImageHistory() {
    try {
        const storedHistory = localStorage.getItem('jlStudioGeneratedImages');
        if (storedHistory) {
            generatedImageHistory = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.warn("Не удалось загрузить историю изображений из localStorage:", e);
        generatedImageHistory = [];
    }
}

/**
 * Сохраняет сгенерированное изображение в историю и localStorage.
 * @param {object} imageData - Данные сгенерированного изображения.
 */
function saveGeneratedImageToHistory(imageData) {
    generatedImageHistory.push(imageData);
    // Ограничиваем историю, например, 50 последними изображениями
    const MAX_HISTORY_LENGTH = 50;
    if (generatedImageHistory.length > MAX_HISTORY_LENGTH) {
        generatedImageHistory.shift(); // Удаляем самый старый элемент
    }
    try {
        localStorage.setItem('jlStudioGeneratedImages', JSON.stringify(generatedImageHistory));
    } catch (e) {
        console.warn("Не удалось сохранить историю изображений в localStorage:", e);
    }
    renderGallery(); // Обновить галерею после добавления
}


/**
 * Асинхронно загружает данные из JSON файла.
 * @param {string} filePath - Путь к JSON файлу.
 * @returns {Promise<object|array|null>} Распарсенные JSON данные или null в случае ошибки.
 */
async function loadJsonData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки ${filePath}: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        showNotification(`Не удалось загрузить данные: ${filePath}. Некоторые функции могут быть недоступны.`, 'error', 0);
        return null;
    }
}

/**
 * Главная функция инициализации приложения.
 */
async function main() {
    loadAppState(); // Загружаем сохраненное состояние (настройки пользователя)
    loadGeneratedImageHistory(); // Загружаем историю ранее сгенерированных картинок

    // 1. Загружаем данные для моделей, стилей, трендов
    const modelsDataPromise = loadJsonData('data/models.json');
    const stylesDataPromise = loadJsonData('data/styles.json');
    const trendsDataPromise = loadJsonData('data/trends.json');
    
    // 2. Параллельно запрашиваем доступные модели у API
    const availableApiModelsPromise = fetchAvailableImageModels();

    // Ожидаем все загрузки
    const [modelsData, stylesData, trendsData, apiModels] = await Promise.all([
        modelsDataPromise,
        stylesDataPromise,
        trendsDataPromise,
        availableApiModelsPromise
    ]);

    appState.imageModelsData = modelsData;
    appState.stylesData = stylesData;
    appState.trendsData = trendsData;
    appState.availableImageModelsFromAPI = apiModels || [];

    // Устанавливаем конфигурацию из models.json, если она там есть
    if (modelsData && modelsData.config) {
        appState.config.imageAnalysisModel = modelsData.config.imageAnalysisModel || appState.config.imageAnalysisModel;
        appState.config.textProcessingModel = modelsData.config.textProcessingModel || appState.config.textProcessingModel;
    }
    
    // Устанавливаем модель по умолчанию, если текущая выбранная модель недоступна
    if (appState.imageModelsData && appState.imageModelsData.imageModelDetails) {
        const defaultModelFromConfig = appState.imageModelsData.defaultImageModel;
        const currentSelectedModelIsValid = appState.availableImageModelsFromAPI.includes(appState.selectedModel) &&
                                            appState.imageModelsData.imageModelDetails.some(m => m.id === appState.selectedModel);
        
        if (!currentSelectedModelIsValid) {
            if (appState.availableImageModelsFromAPI.includes(defaultModelFromConfig) && 
                appState.imageModelsData.imageModelDetails.some(m => m.id === defaultModelFromConfig)) {
                appState.selectedModel = defaultModelFromConfig;
            } else if (appState.availableImageModelsFromAPI.length > 0) {
                // Если дефолтная тоже недоступна, берем первую из доступных API
                appState.selectedModel = appState.availableImageModelsFromAPI[0];
            } else {
                // Если API ничего не вернуло, оставляем как есть или ставим заглушку
                console.warn("API не вернуло список доступных моделей. Используется модель по умолчанию из кода.");
                // appState.selectedModel остается 'flux' или что было загружено из localStorage
            }
        }
    }


    // Восстанавливаем выбранный стиль и тренд из localStorage ПОСЛЕ загрузки stylesData и trendsData
    const storedState = JSON.parse(localStorage.getItem('jlStudioGenAppState') || '{}');
    if (storedState.selectedStyleId && appState.stylesData) {
        appState.selectedStyle = appState.stylesData.find(s => s.id === storedState.selectedStyleId) || null;
    }
    if (storedState.selectedTrendId && appState.trendsData) {
        appState.selectedTrend = appState.trendsData.find(t => t.id === storedState.selectedTrendId) || null;
         if (appState.selectedTrend) appState.selectedStyle = null; // Если есть тренд, стиль сбрасываем
    }


    // 3. Инициализируем UI и остальные модули
    initUI(); // Должен быть первым, чтобы DOM был готов
    initReferences();
    initGenerator();

    // Эти функции теперь вызываются из initUI после того, как данные загружены в appState
    // и appState.availableImageModelsFromAPI заполнен.
    // initModelsModalListeners(); // ui.js теперь сам их вызовет при необходимости
    // initStylesModalListeners();
    // initTrendsModalListeners();

    // Убедимся, что метки кнопок обновлены после всех загрузок
    updateOptionButtonLabels();

    console.log("Приложение инициализировано. Текущее состояние:", appState);
}

// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', main);

// Экспортируем appState и функции управления историей для использования в других модулях
export { appState, generatedImageHistory, saveGeneratedImageToHistory, saveAppState, loadAppState };

// --- END OF FILE jl-studio.art/gen-img-ref/js/main.js ---